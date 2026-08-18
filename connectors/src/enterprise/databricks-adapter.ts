import type { ProviderContext, ProviderHealth } from "../contracts";
import {
  defaultProviderRuntimePolicy,
  ResilientHttpClient,
} from "../resilience";
import type {
  AccessTokenProvider,
  ConnectorConfigurationStatus,
  EnterpriseAuthenticationConfig,
  EnterpriseRecord,
} from "./contracts";

const databricksScope = "2ff814a6-3304-4ab8-85cb-cd0e6f879c1d/.default";
const identifierPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
const forbiddenSql =
  /\b(insert|update|delete|drop|alter|create|merge|copy|call|execute|truncate)\b/i;

export interface DatabricksAdapterConfig {
  readonly workspaceUrl?: string;
  readonly warehouseId?: string;
  readonly catalog?: string;
  readonly schema?: string;
  readonly table?: string;
  readonly approvedQuery?: string;
  readonly sourceIdColumn?: string;
  readonly modifiedAtColumn?: string;
  readonly commodityColumn?: string;
  readonly authentication: EnterpriseAuthenticationConfig;
}

export interface DatabricksRecordQuery {
  readonly changedAfter?: string;
  readonly commodityIds?: readonly string[];
  readonly maximumRecords?: number;
}

interface StatementParameter {
  readonly name: string;
  readonly value: string;
  readonly type: "INT" | "STRING" | "TIMESTAMP";
}

interface StatementResponse {
  readonly statement_id?: string;
  readonly status?: {
    readonly state?: string;
    readonly error?: { readonly message?: string };
  };
  readonly manifest?: {
    readonly schema?: {
      readonly columns?: readonly {
        readonly name?: string;
        readonly position?: number;
      }[];
    };
  };
  readonly result?: { readonly data_array?: readonly (readonly unknown[])[] };
}

export class DatabricksSqlAdapter {
  readonly id = "azure-databricks-sql";
  readonly sourceSystem = "databricks" as const;
  readonly configurationStatus: ConnectorConfigurationStatus;
  readonly #client: ResilientHttpClient;

  constructor(
    private readonly config: DatabricksAdapterConfig,
    private readonly tokens: AccessTokenProvider,
    fetchImplementation: typeof fetch = fetch,
  ) {
    validateDatabricksConfig(config);
    this.configurationStatus =
      config.workspaceUrl &&
      config.warehouseId &&
      config.catalog &&
      config.schema &&
      (config.table || config.approvedQuery)
        ? "ready"
        : "awaiting-configuration";
    this.#client = new ResilientHttpClient(
      this.id,
      defaultProviderRuntimePolicy,
      fetchImplementation,
    );
  }

  async queryRecords(
    query: DatabricksRecordQuery,
    context: ProviderContext,
  ): Promise<readonly EnterpriseRecord[]> {
    this.assertConfigured();
    const { statement, parameters } = buildStatement(this.config, query);
    const response = await this.#client.request(
      `${this.config.workspaceUrl}/api/2.0/sql/statements`,
      {
        method: "POST",
        headers: await this.headers(),
        signal: context.signal,
        body: JSON.stringify({
          warehouse_id: this.config.warehouseId,
          catalog: this.config.catalog,
          schema: this.config.schema,
          statement,
          parameters,
          wait_timeout: "30s",
          on_wait_timeout: "CANCEL",
          disposition: "INLINE",
          format: "JSON_ARRAY",
        }),
      },
    );
    const payload = (await response.json()) as StatementResponse;
    if (payload.status?.state !== "SUCCEEDED") {
      throw new Error(
        payload.status?.error?.message ??
          `Databricks statement ${payload.statement_id ?? "unknown"} did not complete successfully.`,
      );
    }
    return mapRows(this.config, payload);
  }

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();
    if (this.configurationStatus !== "ready") {
      return {
        providerId: this.id,
        status: "not-configured",
        checkedAt,
        message:
          "Awaiting Databricks workspace, warehouse, and dataset configuration.",
      };
    }
    const startedAt = Date.now();
    try {
      await this.#client.request(
        `${this.config.workspaceUrl}/api/2.0/sql/warehouses/${encodeURIComponent(this.config.warehouseId!)}`,
        { headers: await this.headers() },
      );
      return {
        providerId: this.id,
        status: "healthy",
        checkedAt,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        providerId: this.id,
        status: "unavailable",
        checkedAt,
        latencyMs: Date.now() - startedAt,
        message:
          error instanceof Error ? error.message : "Databricks is unavailable.",
      };
    }
  }

  private assertConfigured(): void {
    if (this.configurationStatus !== "ready") {
      throw new Error(
        "Databricks adapter is awaiting environment configuration.",
      );
    }
  }

  private async headers(): Promise<Record<string, string>> {
    return {
      authorization: `Bearer ${await this.tokens.getToken(databricksScope)}`,
      "content-type": "application/json",
      accept: "application/json",
    };
  }
}

function validateDatabricksConfig(config: DatabricksAdapterConfig): void {
  if (config.workspaceUrl) {
    const url = new URL(config.workspaceUrl);
    if (
      url.protocol !== "https:" ||
      !url.hostname.toLowerCase().endsWith(".azuredatabricks.net")
    ) {
      throw new Error(
        "Databricks workspace must be an Azure Databricks HTTPS URL.",
      );
    }
  }
  for (const identifier of [
    config.catalog,
    config.schema,
    config.table,
    config.sourceIdColumn,
    config.modifiedAtColumn,
    config.commodityColumn,
  ]) {
    if (identifier && !identifierPattern.test(identifier)) {
      throw new Error(`Unsafe Databricks identifier: ${identifier}`);
    }
  }
  if (config.table && config.approvedQuery) {
    throw new Error(
      "Configure either a Databricks table or an approved query, not both.",
    );
  }
  if (config.approvedQuery) validateApprovedQuery(config.approvedQuery);
}

function validateApprovedQuery(statement: string): void {
  const normalized = statement.trim();
  if (!/^(select|with)\b/i.test(normalized) || forbiddenSql.test(normalized)) {
    throw new Error("Databricks approvedQuery must be read-only SQL.");
  }
  if (normalized.includes(";") || !normalized.includes(":changed_after")) {
    throw new Error(
      "Databricks approvedQuery must be a single statement filtered by :changed_after.",
    );
  }
  if (!/\blimit\s+:record_limit\b/i.test(normalized)) {
    throw new Error(
      "Databricks approvedQuery must include LIMIT :record_limit.",
    );
  }
}

function buildStatement(
  config: DatabricksAdapterConfig,
  query: DatabricksRecordQuery,
): {
  readonly statement: string;
  readonly parameters: readonly StatementParameter[];
} {
  const maximumRecords = Math.min(
    Math.max(query.maximumRecords ?? 250, 1),
    1_000,
  );
  const modifiedAtColumn = config.modifiedAtColumn ?? "updated_at";
  const commodityColumn = config.commodityColumn ?? "commodity_id";
  const parameters: StatementParameter[] = [
    {
      name: "changed_after",
      value: query.changedAfter ?? "1970-01-01T00:00:00.000Z",
      type: "TIMESTAMP",
    },
    { name: "record_limit", value: String(maximumRecords), type: "INT" },
  ];
  if (config.approvedQuery) {
    return { statement: config.approvedQuery, parameters };
  }
  const tableName = [config.catalog, config.schema, config.table]
    .map((value) => `\`${value}\``)
    .join(".");
  const commodityFilters = (query.commodityIds ?? []).map(
    (commodityId, index) => {
      const name = `commodity_${index}`;
      parameters.push({ name, value: commodityId, type: "STRING" });
      return `:${name}`;
    },
  );
  const where = [
    `\`${modifiedAtColumn}\` > :changed_after`,
    commodityFilters.length
      ? `\`${commodityColumn}\` IN (${commodityFilters.join(", ")})`
      : "",
  ].filter(Boolean);
  return {
    statement: `SELECT * FROM ${tableName} WHERE ${where.join(" AND ")} ORDER BY \`${modifiedAtColumn}\` ASC LIMIT :record_limit`,
    parameters,
  };
}

function mapRows(
  config: DatabricksAdapterConfig,
  payload: StatementResponse,
): readonly EnterpriseRecord[] {
  const columns = [...(payload.manifest?.schema?.columns ?? [])].sort(
    (left, right) => (left.position ?? 0) - (right.position ?? 0),
  );
  const sourceIdColumn = config.sourceIdColumn ?? "record_id";
  const modifiedAtColumn = config.modifiedAtColumn ?? "updated_at";
  return (payload.result?.data_array ?? []).map((row, rowIndex) => {
    const values = Object.fromEntries(
      columns.map((column, index) => [
        column.name ?? `column_${index}`,
        row[index],
      ]),
    );
    const sourceId = values[sourceIdColumn];
    if (sourceId === undefined || sourceId === null || sourceId === "") {
      throw new Error(
        `Databricks row ${rowIndex} is missing source ID column ${sourceIdColumn}.`,
      );
    }
    return {
      reference: {
        system: "databricks",
        sourceId: String(sourceId),
        sourceUri: `${config.workspaceUrl}/sql/editor`,
        sourceVersion: values.version ? String(values.version) : undefined,
        modifiedAt: String(
          values[modifiedAtColumn] ?? new Date(0).toISOString(),
        ),
      },
      values,
    };
  });
}
