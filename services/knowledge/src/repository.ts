import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { rankLocalKnowledge } from "./ranking";
import type {
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
} from "./types";

export interface KnowledgeIndex {
  ensureIndex(): Promise<void>;
  indexDocument(
    document: KnowledgeDocument,
    chunks: readonly KnowledgeChunk[],
  ): Promise<void>;
  search(
    request: KnowledgeSearchRequest,
  ): Promise<readonly KnowledgeSearchResult[]>;
  listDocuments(): Promise<readonly KnowledgeDocument[]>;
}

interface LocalIndexFile {
  readonly documents: readonly KnowledgeDocument[];
  readonly chunks: readonly KnowledgeChunk[];
}

export class LocalKnowledgeIndex implements KnowledgeIndex {
  constructor(private readonly filePath: string) {}

  async ensureIndex(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      await readFile(this.filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await this.write({ documents: [], chunks: [] });
    }
  }

  async indexDocument(
    document: KnowledgeDocument,
    chunks: readonly KnowledgeChunk[],
  ): Promise<void> {
    const current = await this.read();
    const documents = [
      ...current.documents.filter(
        (item) => item.documentId !== document.documentId,
      ),
      document,
    ];
    const retainedChunks = current.chunks.filter(
      (chunk) => chunk.documentId !== document.documentId,
    );
    await this.write({ documents, chunks: [...retainedChunks, ...chunks] });
  }

  async search(
    request: KnowledgeSearchRequest,
  ): Promise<readonly KnowledgeSearchResult[]> {
    const current = await this.read();
    const documents = new Map(
      current.documents.map((document) => [document.documentId, document]),
    );
    return rankLocalKnowledge(request, current.chunks, documents);
  }

  async listDocuments(): Promise<readonly KnowledgeDocument[]> {
    const current = await this.read();
    return [...current.documents].sort(
      (left, right) =>
        Date.parse(right.metadata.date) - Date.parse(left.metadata.date),
    );
  }

  private async read(): Promise<LocalIndexFile> {
    await this.ensureIndex();
    return JSON.parse(await readFile(this.filePath, "utf8")) as LocalIndexFile;
  }

  private async write(value: LocalIndexFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${crypto.randomUUID()}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, this.filePath);
  }
}
