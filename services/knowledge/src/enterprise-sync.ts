import type {
  EnterpriseDocumentConnector,
  EnterpriseDocumentDescriptor,
  ProviderContext,
} from "@dora/connectors";

import { EnterpriseKnowledgeIngestionService } from "./enterprise-ingestion";
import type { KnowledgeDocumentMetadata } from "./types";

type EnterpriseKnowledgeMetadata = Omit<
  KnowledgeDocumentMetadata,
  "sourceSystem" | "externalSourceId" | "externalSourceUri" | "sourceVersion"
>;

export interface EnterpriseMetadataMapper {
  map(
    document: EnterpriseDocumentDescriptor,
  ): Promise<EnterpriseKnowledgeMetadata | null>;
}

export interface EnterpriseSyncResult {
  readonly connectorId: string;
  readonly status: "completed" | "awaiting-configuration";
  readonly discovered: number;
  readonly indexed: number;
  readonly skipped: number;
  readonly continuationToken?: string;
  readonly deltaToken?: string;
}

export class EnterpriseKnowledgeSyncService {
  constructor(
    private readonly ingestion: EnterpriseKnowledgeIngestionService,
  ) {}

  async syncDocuments(
    connector: EnterpriseDocumentConnector,
    mapper: EnterpriseMetadataMapper,
    context: ProviderContext,
    options: {
      readonly continuationToken?: string;
      readonly deltaToken?: string;
      readonly maximumItems?: number;
    } = {},
  ): Promise<EnterpriseSyncResult> {
    if (connector.configurationStatus !== "ready") {
      return {
        connectorId: connector.id,
        status: "awaiting-configuration",
        discovered: 0,
        indexed: 0,
        skipped: 0,
      };
    }
    const page = await connector.listDocuments(options, context);
    let indexed = 0;
    let skipped = 0;
    for (const descriptor of page.documents) {
      const metadata = await mapper.map(descriptor);
      if (!metadata) {
        skipped += 1;
        continue;
      }
      const payload = await connector.downloadDocument(descriptor, context);
      await this.ingestion.ingestDocument(payload, metadata);
      indexed += 1;
    }
    return {
      connectorId: connector.id,
      status: "completed",
      discovered: page.documents.length,
      indexed,
      skipped,
      continuationToken: page.continuationToken,
      deltaToken: page.deltaToken,
    };
  }
}
