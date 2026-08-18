import type { DoraSignal } from "@dora/shared";
import type { NormalizedManufacturingStatus } from "@dora/shared";

export interface RawObjectInput {
  readonly layer?: "raw" | "normalized" | "signals";
  readonly providerId: string;
  readonly runId: string;
  readonly timestamp: string;
  readonly contentType: string;
  readonly data: Uint8Array | string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface RawObjectResult {
  readonly path: string;
  readonly etag?: string;
  readonly writtenAt: string;
}

export interface RawObjectStore {
  put(input: RawObjectInput): Promise<RawObjectResult>;
}

export interface OperationalStore {
  upsertSignals(signals: readonly DoraSignal[]): Promise<number>;
  startIngestionRun?(input: {
    readonly runId: string;
    readonly providerId: string;
    readonly sourceId?: string;
    readonly startedAt: string;
    readonly nextRunAt?: string;
  }): Promise<void>;
  completeIngestionRun?(input: {
    readonly runId: string;
    readonly status: "completed" | "partial" | "failed" | "skipped";
    readonly completedAt: string;
    readonly fetchedItems: number;
    readonly normalizedItems: number;
    readonly signalItems: number;
    readonly rawPath?: string;
    readonly normalizedPath?: string;
    readonly signalPath?: string;
    readonly errorMessage?: string;
    readonly nextRunAt?: string;
  }): Promise<void>;
  healthCheck(): Promise<{
    readonly healthy: boolean;
    readonly message?: string;
  }>;
  close(): Promise<void>;
}

export interface ManufacturingStore {
  listManufacturingStatus(filters?: {
    readonly region?: string;
    readonly status?: NormalizedManufacturingStatus["status"];
    readonly limit?: number;
  }): Promise<readonly NormalizedManufacturingStatus[]>;
}

export interface KnowledgeObjectInput {
  readonly documentId: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly data: Uint8Array;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface KnowledgeObjectStore {
  putDocument(input: KnowledgeObjectInput): Promise<RawObjectResult>;
}
