import type { ProviderHealth } from "../contracts";
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

const powerBiScope = "https://analysis.windows.net/powerbi/api/.default";
const powerBiBaseUrl = "https://api.powerbi.com/v1.0/myorg";

export interface PowerBiAdapterConfig {
  readonly workspaceId?: string;
  readonly semanticModelId?: string;
  readonly approvedQueries: Readonly<Record<string, string>>;
  readonly authentication: EnterpriseAuthenticationConfig;
}

interface PowerBiQueryResponse {
  readonly results?: readonly {
    readonly error?: { readonly message?: string };
    readonly tables?: readonly {
      readonly rows?: readonly Readonly<Record<string, unknown>>[];
    }[];
  }[];
}

export class PowerBiSemanticModelAdapter {
  readonly id = "power-bi-semantic-model";
  readonly sourceSystem = "power-bi" as const;
  readonly configurationStatus: ConnectorConfigurationStatus;
  readonly #client: ResilientHttpClient;

  constructor(
    private readonly config: PowerBiAdapterConfig,
    private readonly tokens: AccessTokenProvider,
    fetchImplementation: typeof fetch = fetch,
  ) {
    this.configurationStatus =
      config.workspaceId &&
      config.semanticModelId &&
      Object.keys(config.approvedQueries).length
        ? "ready"
        : "awaiting-configuration";
    this.#client = new ResilientHttpClient(
      this.id,
      defaultProviderRuntimePolicy,
      fetchImplementation,
    );
  }

  async executeApprovedQuery(
    queryName: string,
    signal?: AbortSignal,
  ): Promise<readonly EnterpriseRecord[]> {
    this.assertConfigured();
    const query = this.config.approvedQueries[queryName];
    if (!query)
      throw new Error(`Power BI query '${queryName}' is not approved.`);
    const response = await this.#client.request(
      `${powerBiBaseUrl}/groups/${encodeURIComponent(this.config.workspaceId!)}/datasets/${encodeURIComponent(this.config.semanticModelId!)}/executeQueries`,
      {
        method: "POST",
        headers: await this.headers(),
        signal,
        body: JSON.stringify({
          queries: [{ query }],
          serializerSettings: { includeNulls: true },
        }),
      },
    );
    const payload = (await response.json()) as PowerBiQueryResponse;
    const error = payload.results?.find((result) => result.error)?.error;
    if (error) throw new Error(error.message ?? "Power BI query failed.");
    return (payload.results ?? [])
      .flatMap((result) =>
        (result.tables ?? []).flatMap((table) => table.rows ?? []),
      )
      .map((values, index) => ({
        reference: {
          system: "power-bi",
          sourceId: `${this.config.semanticModelId}:${queryName}:${index}`,
          sourceUri: `https://app.powerbi.com/groups/${this.config.workspaceId}/datasets/${this.config.semanticModelId}`,
          modifiedAt: new Date().toISOString(),
        },
        values,
      }));
  }

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();
    if (this.configurationStatus !== "ready") {
      return {
        providerId: this.id,
        status: "not-configured",
        checkedAt,
        message:
          "Awaiting Power BI workspace and semantic model configuration.",
      };
    }
    const startedAt = Date.now();
    try {
      await this.#client.request(
        `${powerBiBaseUrl}/groups/${encodeURIComponent(this.config.workspaceId!)}/datasets/${encodeURIComponent(this.config.semanticModelId!)}`,
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
          error instanceof Error ? error.message : "Power BI is unavailable.",
      };
    }
  }

  private assertConfigured(): void {
    if (this.configurationStatus !== "ready") {
      throw new Error(
        "Power BI adapter is awaiting environment configuration.",
      );
    }
  }

  private async headers(): Promise<Record<string, string>> {
    return {
      authorization: `Bearer ${await this.tokens.getToken(powerBiScope)}`,
      "content-type": "application/json",
      accept: "application/json",
    };
  }
}
