import { AzureIdentityTokenProvider } from "./authentication";
import type { EnterpriseAuthenticationConfig } from "./contracts";
import {
  DatabricksSqlAdapter,
  type DatabricksAdapterConfig,
} from "./databricks-adapter";
import {
  PowerBiSemanticModelAdapter,
  type PowerBiAdapterConfig,
} from "./power-bi-adapter";
import {
  SharePointGraphConnector,
  type SharePointConnectorConfig,
} from "./sharepoint-connector";

export interface EnterpriseAdapters {
  readonly sharePoint: SharePointGraphConnector;
  readonly databricks: DatabricksSqlAdapter;
  readonly powerBi: PowerBiSemanticModelAdapter;
}

export function createEnterpriseAdaptersFromEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): EnterpriseAdapters {
  const sharePointConfig: SharePointConnectorConfig = {
    siteId: value(environment.SHAREPOINT_SITE_ID),
    driveId: value(environment.SHAREPOINT_DRIVE_ID),
    authentication: authentication(environment, "SHAREPOINT"),
  };
  const databricksConfig: DatabricksAdapterConfig = {
    workspaceUrl: value(environment.DATABRICKS_WORKSPACE_URL)?.replace(
      /\/$/,
      "",
    ),
    warehouseId: value(environment.DATABRICKS_WAREHOUSE_ID),
    catalog: value(environment.DATABRICKS_CATALOG),
    schema: value(environment.DATABRICKS_SCHEMA),
    table: value(environment.DATABRICKS_TABLE),
    approvedQuery: value(environment.DATABRICKS_APPROVED_QUERY),
    sourceIdColumn: value(environment.DATABRICKS_SOURCE_ID_COLUMN),
    modifiedAtColumn: value(environment.DATABRICKS_MODIFIED_AT_COLUMN),
    commodityColumn: value(environment.DATABRICKS_COMMODITY_COLUMN),
    authentication: authentication(environment, "DATABRICKS"),
  };
  const powerBiConfig: PowerBiAdapterConfig = {
    workspaceId: value(environment.POWER_BI_WORKSPACE_ID),
    semanticModelId: value(environment.POWER_BI_SEMANTIC_MODEL_ID),
    approvedQueries: parseApprovedQueries(
      environment.POWER_BI_APPROVED_QUERIES_JSON,
    ),
    authentication: authentication(environment, "POWER_BI"),
  };
  return {
    sharePoint: new SharePointGraphConnector(
      sharePointConfig,
      new AzureIdentityTokenProvider(sharePointConfig.authentication),
    ),
    databricks: new DatabricksSqlAdapter(
      databricksConfig,
      new AzureIdentityTokenProvider(databricksConfig.authentication),
    ),
    powerBi: new PowerBiSemanticModelAdapter(
      powerBiConfig,
      new AzureIdentityTokenProvider(powerBiConfig.authentication),
    ),
  };
}

function authentication(
  environment: Readonly<Record<string, string | undefined>>,
  prefix: "SHAREPOINT" | "DATABRICKS" | "POWER_BI",
): EnterpriseAuthenticationConfig {
  const method = environment[`${prefix}_AUTH_METHOD`];
  if (
    method &&
    method !== "managed-identity" &&
    method !== "entra-application"
  ) {
    throw new Error(`${prefix}_AUTH_METHOD is invalid.`);
  }
  const authenticationMethod: EnterpriseAuthenticationConfig["method"] =
    method === "entra-application" ? "entra-application" : "managed-identity";
  return {
    method: authenticationMethod,
    managedIdentityClientId: value(
      environment[`${prefix}_MANAGED_IDENTITY_CLIENT_ID`] ??
        environment.AZURE_CLIENT_ID,
    ),
  };
}

function parseApprovedQueries(
  value: string | undefined,
): Record<string, string> {
  if (!value?.trim()) return {};
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("POWER_BI_APPROVED_QUERIES_JSON must be a JSON object.");
  }
  const queries = Object.fromEntries(
    Object.entries(parsed).map(([name, query]) => {
      if (!name.trim() || typeof query !== "string" || !query.trim()) {
        throw new Error(
          "Power BI approved queries must have string names and values.",
        );
      }
      return [name, query];
    }),
  );
  return queries;
}

function value(input: string | undefined): string | undefined {
  return input?.trim() || undefined;
}
