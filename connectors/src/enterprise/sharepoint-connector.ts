import type { ProviderContext, ProviderHealth } from "../contracts";
import {
  defaultProviderRuntimePolicy,
  ResilientHttpClient,
} from "../resilience";
import type {
  AccessTokenProvider,
  ConnectorConfigurationStatus,
  EnterpriseAuthenticationConfig,
  EnterpriseDocumentConnector,
  EnterpriseDocumentDescriptor,
  EnterpriseDocumentPage,
  EnterpriseDocumentPayload,
  EnterpriseDocumentSyncQuery,
} from "./contracts";

const graphScope = "https://graph.microsoft.com/.default";
const graphBaseUrl = "https://graph.microsoft.com/v1.0";

export interface SharePointConnectorConfig {
  readonly siteId?: string;
  readonly driveId?: string;
  readonly authentication: EnterpriseAuthenticationConfig;
}

interface GraphDriveItem {
  readonly id: string;
  readonly name?: string;
  readonly size?: number;
  readonly webUrl?: string;
  readonly eTag?: string;
  readonly cTag?: string;
  readonly lastModifiedDateTime?: string;
  readonly file?: { readonly mimeType?: string };
  readonly folder?: unknown;
  readonly deleted?: unknown;
  readonly parentReference?: { readonly path?: string };
  readonly sharepointIds?: Readonly<Record<string, string>>;
}

interface GraphDeltaResponse {
  readonly value?: readonly GraphDriveItem[];
  readonly "@odata.nextLink"?: string;
  readonly "@odata.deltaLink"?: string;
}

export class SharePointGraphConnector implements EnterpriseDocumentConnector {
  readonly id = "sharepoint-graph";
  readonly sourceSystem = "sharepoint" as const;
  readonly configurationStatus: ConnectorConfigurationStatus;
  readonly #client: ResilientHttpClient;

  constructor(
    private readonly config: SharePointConnectorConfig,
    private readonly tokens: AccessTokenProvider,
    fetchImplementation: typeof fetch = fetch,
  ) {
    this.configurationStatus =
      config.siteId && config.driveId ? "ready" : "awaiting-configuration";
    this.#client = new ResilientHttpClient(
      this.id,
      defaultProviderRuntimePolicy,
      fetchImplementation,
    );
  }

  async listDocuments(
    query: EnterpriseDocumentSyncQuery,
    context: ProviderContext,
  ): Promise<EnterpriseDocumentPage> {
    this.assertConfigured();
    const url = resolveDeltaUrl(this.config, query);
    const response = await this.#client.request(url, {
      headers: await this.headers(),
      signal: context.signal,
    });
    const payload = (await response.json()) as GraphDeltaResponse;
    const documents = (payload.value ?? [])
      .filter((item) => item.file && !item.deleted && !item.folder)
      .map(mapGraphDocument);
    return {
      documents,
      continuationToken: tokenFromGraphLink(payload["@odata.nextLink"]),
      deltaToken: tokenFromGraphLink(payload["@odata.deltaLink"]),
    };
  }

  async downloadDocument(
    document: EnterpriseDocumentDescriptor,
    context: ProviderContext,
  ): Promise<EnterpriseDocumentPayload> {
    this.assertConfigured();
    const itemId = encodeURIComponent(document.reference.sourceId);
    const response = await this.#client.request(
      `${graphBaseUrl}/sites/${encodeURIComponent(this.config.siteId!)}/drives/${encodeURIComponent(this.config.driveId!)}/items/${itemId}/content`,
      { headers: await this.headers(), signal: context.signal },
    );
    return {
      ...document,
      contentType: response.headers.get("content-type") ?? document.contentType,
      data: new Uint8Array(await response.arrayBuffer()),
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();
    if (this.configurationStatus !== "ready") {
      return {
        providerId: this.id,
        status: "not-configured",
        checkedAt,
        message: "Awaiting SharePoint site and drive configuration.",
      };
    }
    const startedAt = Date.now();
    try {
      await this.#client.request(
        `${graphBaseUrl}/sites/${encodeURIComponent(this.config.siteId!)}/drives/${encodeURIComponent(this.config.driveId!)}?$select=id,name`,
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
          error instanceof Error ? error.message : "SharePoint is unavailable.",
      };
    }
  }

  private assertConfigured(): void {
    if (this.configurationStatus !== "ready") {
      throw new Error(
        "SharePoint connector is awaiting environment configuration.",
      );
    }
  }

  private async headers(): Promise<Record<string, string>> {
    return {
      authorization: `Bearer ${await this.tokens.getToken(graphScope)}`,
      accept: "application/json",
    };
  }
}

function resolveDeltaUrl(
  config: SharePointConnectorConfig,
  query: EnterpriseDocumentSyncQuery,
): string {
  const token = query.continuationToken ?? query.deltaToken;
  if (token) {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    if (!decoded.startsWith(`${graphBaseUrl}/`)) {
      throw new Error("SharePoint continuation token is invalid.");
    }
    return decoded;
  }
  const fields = [
    "id",
    "name",
    "size",
    "webUrl",
    "eTag",
    "cTag",
    "lastModifiedDateTime",
    "file",
    "folder",
    "deleted",
    "parentReference",
    "sharepointIds",
  ].join(",");
  const maximumItems = Math.min(Math.max(query.maximumItems ?? 200, 1), 999);
  return `${graphBaseUrl}/sites/${encodeURIComponent(config.siteId!)}/drives/${encodeURIComponent(config.driveId!)}/root/delta?$select=${fields}&$top=${maximumItems}`;
}

function tokenFromGraphLink(link: string | undefined): string | undefined {
  return link ? Buffer.from(link, "utf8").toString("base64url") : undefined;
}

function mapGraphDocument(item: GraphDriveItem): EnterpriseDocumentDescriptor {
  const modifiedAt = item.lastModifiedDateTime ?? new Date(0).toISOString();
  return {
    reference: {
      system: "sharepoint",
      sourceId: item.id,
      sourceUri: item.webUrl,
      sourceVersion: item.eTag ?? item.cTag,
      modifiedAt,
    },
    fileName: item.name ?? item.id,
    contentType: item.file?.mimeType ?? "application/octet-stream",
    sizeBytes: item.size,
    metadata: {
      parentPath: item.parentReference?.path ?? "",
      ...item.sharepointIds,
    },
  };
}
