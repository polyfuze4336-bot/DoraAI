import type { KnowledgeObjectStore } from "@dora/storage";
import { z } from "zod";

import { chunkDocument } from "./chunker";
import { parseDocument } from "./parser";
import type { KnowledgeIndex } from "./repository";
import type { GroundedSummarizer } from "./summarizer";
import {
  classifications,
  sourceSystems,
  type GroundedAnswer,
  type KnowledgeDocument,
  type KnowledgeDocumentMetadata,
  type KnowledgeSearchRequest,
  type KnowledgeSearchResult,
} from "./types";

const metadataSchema = z.object({
  title: z.string().trim().min(2).max(240),
  author: z.string().trim().max(160).default(""),
  date: z.iso.datetime({ offset: true }),
  businessUnit: z.string().trim().min(2).max(120),
  commodity: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(120),
  documentType: z.string().trim().min(2).max(80),
  sourceSystem: z.enum(sourceSystems),
  externalSourceId: z.string().trim().min(1).max(512).optional(),
  externalSourceUri: z.url().optional(),
  sourceVersion: z.string().trim().min(1).max(512).optional(),
  version: z.string().trim().min(1).max(40),
  classification: z.enum(classifications),
  authorityRank: z.coerce.number().int().min(0).max(100),
  status: z.enum(["current", "superseded", "archived"]),
});

export interface UploadKnowledgeInput {
  readonly fileName: string;
  readonly contentType: string;
  readonly data: Uint8Array;
  readonly metadata: KnowledgeDocumentMetadata;
}

export class KnowledgeService {
  constructor(
    private readonly objectStore: KnowledgeObjectStore,
    private readonly index: KnowledgeIndex,
    private readonly summarizer: GroundedSummarizer,
  ) {}

  async initialize(): Promise<void> {
    await this.index.ensureIndex();
  }

  async upload(input: UploadKnowledgeInput): Promise<KnowledgeDocument> {
    const metadata = metadataSchema.parse(input.metadata);
    const parsed = await parseDocument(
      input.fileName,
      input.contentType,
      input.data,
    );
    const documentId = stableDocumentId(parsed.contentHash, metadata.version);
    const stored = await this.objectStore.putDocument({
      documentId,
      fileName: input.fileName,
      contentType: input.contentType,
      data: input.data,
      metadata: serializeMetadata(metadata),
    });
    const now = new Date().toISOString();
    const document: KnowledgeDocument = {
      documentId,
      fileName: input.fileName,
      contentType: input.contentType,
      metadata,
      contentHash: parsed.contentHash,
      objectPath: stored.path,
      summary: summarizeText(parsed.text),
      createdAt: now,
      indexedAt: now,
    };
    const chunks = chunkDocument({
      documentId,
      text: parsed.text,
      metadata,
    });
    await this.index.indexDocument(document, chunks);
    return document;
  }

  search(
    request: KnowledgeSearchRequest,
  ): Promise<readonly KnowledgeSearchResult[]> {
    return this.index.search(request);
  }

  async answer(
    question: string,
    request: Omit<KnowledgeSearchRequest, "query"> = {},
  ): Promise<GroundedAnswer> {
    const results = await this.search({ ...request, query: question, top: 12 });
    return this.summarizer.summarize(question, results);
  }

  listDocuments(): Promise<readonly KnowledgeDocument[]> {
    return this.index.listDocuments();
  }
}

export function parseKnowledgeMetadata(
  value: unknown,
): KnowledgeDocumentMetadata {
  return metadataSchema.parse(value);
}

function stableDocumentId(contentHash: string, version: string): string {
  return `${contentHash.slice(0, 24)}-${version.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
}

function serializeMetadata(
  metadata: KnowledgeDocumentMetadata,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}

function summarizeText(text: string): string {
  const firstParagraph = text.split(/\n{2,}/).find((value) => value.trim());
  return (firstParagraph ?? text).replace(/\s+/g, " ").trim().slice(0, 500);
}
