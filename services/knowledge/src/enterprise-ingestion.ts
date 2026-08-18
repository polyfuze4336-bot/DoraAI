import type {
  EnterpriseDocumentPayload,
  EnterpriseRecord,
} from "@dora/connectors";

import { KnowledgeService } from "./service";
import type {
  KnowledgeDocument,
  KnowledgeDocumentMetadata,
  SourceSystem,
} from "./types";

type EnterpriseKnowledgeMetadata = Omit<
  KnowledgeDocumentMetadata,
  "sourceSystem" | "externalSourceId" | "externalSourceUri" | "sourceVersion"
>;

export class EnterpriseKnowledgeIngestionService {
  constructor(private readonly knowledge: KnowledgeService) {}

  ingestDocument(
    source: EnterpriseDocumentPayload,
    metadata: EnterpriseKnowledgeMetadata,
  ): Promise<KnowledgeDocument> {
    const sourceSystem = knowledgeSourceSystem(source.reference.system);
    return this.knowledge.upload({
      fileName: source.fileName,
      contentType: source.contentType,
      data: source.data,
      metadata: {
        ...metadata,
        sourceSystem,
        externalSourceId: source.reference.sourceId,
        externalSourceUri: source.reference.sourceUri,
        sourceVersion: source.reference.sourceVersion,
      },
    });
  }

  ingestDatabricksRecord(
    record: EnterpriseRecord,
    content: string,
    metadata: EnterpriseKnowledgeMetadata,
    fileName = `${safeFileSegment(record.reference.sourceId)}.txt`,
  ): Promise<KnowledgeDocument> {
    if (record.reference.system !== "databricks") {
      throw new Error(
        "Record ingestion currently supports Databricks records only.",
      );
    }
    return this.knowledge.upload({
      fileName,
      contentType: "text/plain",
      data: new TextEncoder().encode(content),
      metadata: {
        ...metadata,
        sourceSystem: "databricks",
        externalSourceId: record.reference.sourceId,
        externalSourceUri: record.reference.sourceUri,
        sourceVersion: record.reference.sourceVersion,
      },
    });
  }
}

function knowledgeSourceSystem(system: string): SourceSystem {
  if (system === "sharepoint" || system === "databricks") return system;
  throw new Error(
    `${system} is an analytics source and cannot be ingested as a knowledge document.`,
  );
}

function safeFileSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 160);
}
