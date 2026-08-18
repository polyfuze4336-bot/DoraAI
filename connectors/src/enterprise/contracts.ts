import type { ProviderContext, ProviderHealth } from "../contracts";

export const enterpriseSourceSystems = [
  "sharepoint",
  "databricks",
  "power-bi",
] as const;

export type EnterpriseSourceSystem = (typeof enterpriseSourceSystems)[number];
export type EnterpriseAuthenticationMethod =
  "managed-identity" | "entra-application";
export type ConnectorConfigurationStatus = "ready" | "awaiting-configuration";

export interface EnterpriseAuthenticationConfig {
  readonly method: EnterpriseAuthenticationMethod;
  readonly managedIdentityClientId?: string;
}

export interface AccessTokenProvider {
  getToken(scope: string): Promise<string>;
}

export interface EnterpriseSourceReference {
  readonly system: EnterpriseSourceSystem;
  readonly sourceId: string;
  readonly sourceUri?: string;
  readonly sourceVersion?: string;
  readonly modifiedAt: string;
}

export interface EnterpriseDocumentDescriptor {
  readonly reference: EnterpriseSourceReference;
  readonly fileName: string;
  readonly contentType: string;
  readonly sizeBytes?: number;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface EnterpriseDocumentPayload extends EnterpriseDocumentDescriptor {
  readonly data: Uint8Array;
}

export interface EnterpriseDocumentPage {
  readonly documents: readonly EnterpriseDocumentDescriptor[];
  readonly continuationToken?: string;
  readonly deltaToken?: string;
}

export interface EnterpriseDocumentSyncQuery {
  readonly continuationToken?: string;
  readonly deltaToken?: string;
  readonly maximumItems?: number;
}

export interface EnterpriseDocumentConnector {
  readonly id: string;
  readonly sourceSystem: EnterpriseSourceSystem;
  readonly configurationStatus: ConnectorConfigurationStatus;
  listDocuments(
    query: EnterpriseDocumentSyncQuery,
    context: ProviderContext,
  ): Promise<EnterpriseDocumentPage>;
  downloadDocument(
    document: EnterpriseDocumentDescriptor,
    context: ProviderContext,
  ): Promise<EnterpriseDocumentPayload>;
  healthCheck(): Promise<ProviderHealth>;
}

export interface EnterpriseRecord {
  readonly reference: EnterpriseSourceReference;
  readonly values: Readonly<Record<string, unknown>>;
}
