import {
  appendFile,
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";

import type { ProviderKind } from "@dora/connectors";
import type { RawObjectStore, RuntimeStateStore } from "@dora/storage";
import type { DataProvenance, DoraSignal } from "@dora/shared";

interface ProvenanceItem {
  readonly provenance: DataProvenance;
}

export interface IngestionBatch {
  readonly runId: string;
  readonly providerId: string;
  readonly providerKind: ProviderKind;
  readonly ingestedAt: string;
  readonly items: readonly ProvenanceItem[];
}

export interface RawIngestionBatch {
  readonly runId: string;
  readonly providerId: string;
  readonly providerKind: ProviderKind;
  readonly fetchedAt: string;
  readonly ingestedAt: string;
  readonly sourceVersion?: string;
  readonly metadata: Readonly<Record<string, string>>;
  readonly data: unknown;
}

export interface SignalIngestionBatch {
  readonly runId: string;
  readonly providerId: string;
  readonly providerKind: ProviderKind;
  readonly normalizedAt: string;
  readonly rawBatchPath: string;
  readonly normalizedBatchPath: string;
  readonly signals: readonly DoraSignal[];
}

export interface IngestionStore {
  writeRawBatch(batch: RawIngestionBatch): Promise<string>;
  writeBatch(batch: IngestionBatch): Promise<string>;
  writeSignalBatch(batch: SignalIngestionBatch): Promise<string>;
  lastAttemptedRun(providerId: string): Promise<string | undefined>;
  markAttempted(providerId: string, attemptedAt: string): Promise<void>;
  markSuccessful(providerId: string, completedAt: string): Promise<void>;
  writeRunRecord?(record: IngestionRunRecord): Promise<void>;
}

export interface IngestionRunRecord {
  readonly runId: string;
  readonly providerId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly status: "completed" | "failed";
  readonly fetchedRecords: number;
  readonly normalizedRecords: number;
  readonly signalRecords: number;
  readonly success: boolean;
  readonly error?: string;
  readonly nextRunAt: string;
  readonly rawPath?: string;
  readonly normalizedPath?: string;
  readonly signalPath?: string;
}

interface ProviderRunState {
  readonly lastAttemptedAt: string;
  readonly lastSuccessfulAt?: string;
}

interface ProviderStateFile {
  readonly providers: Readonly<Record<string, ProviderRunState>>;
}

export class JsonFileIngestionStore implements IngestionStore {
  readonly #statePath: string;

  constructor(private readonly rootDirectory: string) {
    this.#statePath = join(rootDirectory, "provider-state.json");
  }

  async writeRawBatch(batch: RawIngestionBatch): Promise<string> {
    const outputPath = this.batchPath(
      "raw",
      batch.providerId,
      batch.ingestedAt,
      batch.runId,
    );
    await mkdir(dirname(outputPath), { recursive: true });
    await writeJsonAtomically(outputPath, {
      schemaVersion: 1,
      layer: "raw",
      ...batch,
    });
    return outputPath;
  }

  async writeBatch(batch: IngestionBatch): Promise<string> {
    for (const [index, item] of batch.items.entries()) {
      if (!item.provenance?.sourceTimestamp || !item.provenance.ingestedAt) {
        throw new Error(
          `${batch.providerId} item ${index} is missing required provenance.`,
        );
      }
    }

    const outputPath = this.batchPath(
      "normalized",
      batch.providerId,
      batch.ingestedAt,
      batch.runId,
    );
    await mkdir(dirname(outputPath), { recursive: true });
    await writeJsonAtomically(outputPath, {
      schemaVersion: 1,
      layer: "normalized",
      ...batch,
      itemCount: batch.items.length,
    });
    return outputPath;
  }

  async writeSignalBatch(batch: SignalIngestionBatch): Promise<string> {
    for (const [index, signal] of batch.signals.entries()) {
      if (
        !signal.provenance?.sourceTimestamp ||
        !signal.rawReference.rawBatchPath
      ) {
        throw new Error(
          `${batch.providerId} signal ${index} is missing source traceability.`,
        );
      }
    }

    const outputPath = this.batchPath(
      "signals",
      batch.providerId,
      batch.normalizedAt,
      batch.runId,
    );
    await mkdir(dirname(outputPath), { recursive: true });
    await writeJsonAtomically(outputPath, {
      schemaVersion: 1,
      layer: "signals",
      ...batch,
      signalCount: batch.signals.length,
    });
    return outputPath;
  }

  async lastAttemptedRun(providerId: string): Promise<string | undefined> {
    const state = await this.readState();
    return state.providers[providerId]?.lastAttemptedAt;
  }

  async markAttempted(providerId: string, attemptedAt: string): Promise<void> {
    const state = await this.readState();
    await this.writeState({
      providers: {
        ...state.providers,
        [providerId]: {
          ...state.providers[providerId],
          lastAttemptedAt: attemptedAt,
        },
      },
    });
  }

  async markSuccessful(providerId: string, completedAt: string): Promise<void> {
    const state = await this.readState();
    await this.writeState({
      providers: {
        ...state.providers,
        [providerId]: {
          lastAttemptedAt:
            state.providers[providerId]?.lastAttemptedAt ?? completedAt,
          lastSuccessfulAt: completedAt,
        },
      },
    });
  }

  async writeRunRecord(record: IngestionRunRecord): Promise<void> {
    const path = join(this.rootDirectory, "ingestion-runs.jsonl");
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify(record)}\n`, "utf8");
  }

  private async readState(): Promise<ProviderStateFile> {
    try {
      const raw = await readFile(this.#statePath, "utf8");
      const parsed = JSON.parse(raw) as {
        providers?: Record<string, ProviderRunState | string>;
      };
      return {
        providers: Object.fromEntries(
          Object.entries(parsed.providers ?? {}).map(([providerId, value]) => [
            providerId,
            typeof value === "string"
              ? { lastAttemptedAt: value, lastSuccessfulAt: value }
              : value,
          ]),
        ),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { providers: {} };
      }
      throw error;
    }
  }

  private async writeState(state: ProviderStateFile): Promise<void> {
    await mkdir(dirname(this.#statePath), { recursive: true });
    await writeJsonAtomically(this.#statePath, state);
  }

  private batchPath(
    layer: "raw" | "normalized" | "signals",
    providerId: string,
    timestamp: string,
    runId: string,
  ): string {
    return join(
      this.rootDirectory,
      layer,
      safeSegment(providerId),
      timestamp.slice(0, 10),
      `${safeSegment(runId)}.json`,
    );
  }
}

export class AzureIngestionStore implements IngestionStore {
  constructor(
    private readonly objectStore: RawObjectStore,
    private readonly stateStore: RuntimeStateStore,
  ) {}

  async writeRawBatch(batch: RawIngestionBatch): Promise<string> {
    return this.writeArtifact(
      "raw",
      batch.providerId,
      batch.runId,
      batch.ingestedAt,
      batch,
    );
  }

  async writeBatch(batch: IngestionBatch): Promise<string> {
    for (const [index, item] of batch.items.entries()) {
      if (!item.provenance?.sourceTimestamp || !item.provenance.ingestedAt) {
        throw new Error(
          `${batch.providerId} item ${index} is missing required provenance.`,
        );
      }
    }
    return this.writeArtifact(
      "normalized",
      batch.providerId,
      batch.runId,
      batch.ingestedAt,
      { ...batch, itemCount: batch.items.length },
    );
  }

  async writeSignalBatch(batch: SignalIngestionBatch): Promise<string> {
    for (const [index, signal] of batch.signals.entries()) {
      if (
        !signal.provenance?.sourceTimestamp ||
        !signal.rawReference.rawBatchPath
      ) {
        throw new Error(
          `${batch.providerId} signal ${index} is missing source traceability.`,
        );
      }
    }
    return this.writeArtifact(
      "signals",
      batch.providerId,
      batch.runId,
      batch.normalizedAt,
      { ...batch, signalCount: batch.signals.length },
    );
  }

  async lastAttemptedRun(providerId: string): Promise<string | undefined> {
    return (await this.readState()).providers[providerId]?.lastAttemptedAt;
  }

  async markAttempted(providerId: string, attemptedAt: string): Promise<void> {
    const state = await this.readState();
    await this.stateStore.write("pipeline:provider-state", {
      providers: {
        ...state.providers,
        [providerId]: {
          ...state.providers[providerId],
          lastAttemptedAt: attemptedAt,
        },
      },
    });
  }

  async markSuccessful(providerId: string, completedAt: string): Promise<void> {
    const state = await this.readState();
    await this.stateStore.write("pipeline:provider-state", {
      providers: {
        ...state.providers,
        [providerId]: {
          lastAttemptedAt:
            state.providers[providerId]?.lastAttemptedAt ?? completedAt,
          lastSuccessfulAt: completedAt,
        },
      },
    });
  }

  private readState(): Promise<ProviderStateFile> {
    return this.stateStore.read<ProviderStateFile>("pipeline:provider-state", {
      providers: {},
    });
  }

  private async writeArtifact(
    layer: "raw" | "normalized" | "signals",
    providerId: string,
    runId: string,
    timestamp: string,
    value: unknown,
  ): Promise<string> {
    return (
      await this.objectStore.put({
        layer,
        providerId,
        runId,
        timestamp,
        contentType: "application/json",
        data: `${JSON.stringify({ schemaVersion: 1, layer, ...asRecord(value) })}\n`,
      })
    ).path;
  }
}

async function writeJsonAtomically(
  path: string,
  value: unknown,
): Promise<void> {
  const temporaryPath = `${path}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : { value };
}
