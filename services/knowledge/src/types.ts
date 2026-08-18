export const sourceSystems = [
  "upload",
  "sharepoint",
  "databricks",
  "internal-research",
  "news-archive",
] as const;

export const classifications = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;

export type SourceSystem = (typeof sourceSystems)[number];
export type DocumentClassification = (typeof classifications)[number];

export interface KnowledgeDocumentMetadata {
  readonly title: string;
  readonly author: string;
  readonly date: string;
  readonly businessUnit: string;
  readonly commodity: string;
  readonly region: string;
  readonly documentType: string;
  readonly sourceSystem: SourceSystem;
  readonly externalSourceId?: string;
  readonly externalSourceUri?: string;
  readonly sourceVersion?: string;
  readonly version: string;
  readonly classification: DocumentClassification;
  readonly authorityRank: number;
  readonly status: "current" | "superseded" | "archived";
}

export interface KnowledgeDocument {
  readonly documentId: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly metadata: KnowledgeDocumentMetadata;
  readonly contentHash: string;
  readonly objectPath: string;
  readonly summary: string;
  readonly createdAt: string;
  readonly indexedAt: string;
}

export interface KnowledgeChunk {
  readonly chunkId: string;
  readonly documentId: string;
  readonly chunkIndex: number;
  readonly heading: string | null;
  readonly content: string;
  readonly tokenCount: number;
  readonly citationLabel: string;
  readonly contentHash: string;
  readonly metadata: KnowledgeDocumentMetadata;
  readonly embedding?: readonly number[];
}

export interface KnowledgeSearchRequest {
  readonly query: string;
  readonly top?: number;
  readonly commodity?: string;
  readonly region?: string;
  readonly classification?: DocumentClassification;
  readonly queryVector?: readonly number[];
}

export interface KnowledgeSearchResult {
  readonly chunk: KnowledgeChunk;
  readonly document: KnowledgeDocument;
  readonly score: number;
  readonly keywordScore: number;
  readonly vectorScore: number | null;
  readonly authorityScore: number;
  readonly freshnessScore: number;
  readonly rerankerScore?: number;
}

export interface KnowledgeCitation {
  readonly citationId: string;
  readonly documentId: string;
  readonly chunkId: string;
  readonly title: string;
  readonly author: string;
  readonly date: string;
  readonly sourceSystem: SourceSystem;
  readonly citationLabel: string;
  readonly excerpt: string;
}

export interface GroundedAnswer {
  readonly answer: string;
  readonly citations: readonly KnowledgeCitation[];
  readonly relatedReports: readonly KnowledgeDocument[];
  readonly mode: "azure-openai" | "extractive";
  readonly limitations: readonly string[];
}
