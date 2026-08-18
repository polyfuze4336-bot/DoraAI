import {
  createConfiguredProviderRegistry,
  type ProviderKind,
  type ProviderRegistration,
} from "@dora/connectors";
import { createDefaultIntelligenceRegistry } from "@dora/intelligence";
import { createDefaultSignalNormalizationRegistry } from "@dora/normalization";
import type { DataProvenance } from "@dora/shared";
import {
  AzureBlobObjectStore,
  PostgresOperationalStore,
  PostgresRuntimeStateStore,
  postgresConfigFromEnvironment,
  type OperationalStore,
  type RawObjectStore,
} from "@dora/storage";
import { logStructured } from "@dora/observability";

import { loadPipelineConfig } from "./config";
import {
  AzureIngestionStore,
  JsonFileIngestionStore,
  type IngestionStore,
} from "./ingestion-store";

interface ProvenanceItem {
  readonly provenance: DataProvenance;
}

export interface ProviderRunResult {
  readonly runId?: string;
  readonly providerId: string;
  readonly providerKind: ProviderKind;
  readonly status: "completed" | "skipped" | "failed";
  readonly items: number;
  readonly signals: number;
  readonly rawBatchPath?: string;
  readonly normalizedBatchPath?: string;
  readonly signalBatchPath?: string;
  readonly error?: string;
  readonly nextRunAt?: string;
}

export interface PipelineRunSummary {
  readonly status: "idle" | "completed" | "partial" | "failed";
  readonly startedAt: string;
  readonly completedAt: string;
  readonly providers: number;
  readonly completedProviders: number;
  readonly skippedProviders: number;
  readonly failedProviders: number;
  readonly observations: number;
  readonly signals: number;
  readonly intelligenceDomains: number;
  readonly results: readonly ProviderRunResult[];
}

interface PipelineDependencies {
  readonly fetchImplementation?: typeof fetch;
  readonly store?: IngestionStore;
  readonly rawObjectStore?: RawObjectStore;
  readonly operationalStore?: OperationalStore;
  readonly now?: () => Date;
}

export async function runPipeline(
  environment: Record<string, string | undefined> = process.env,
  dependencies: PipelineDependencies = {},
): Promise<PipelineRunSummary> {
  const now = dependencies.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const config = loadPipelineConfig(environment);
  const providerRegistry = createConfiguredProviderRegistry(config.providers, {
    environment,
    fetchImplementation: dependencies.fetchImplementation,
  });
  const rawObjectStore =
    dependencies.rawObjectStore ?? createRawObjectStore(environment);
  const operationalStore =
    dependencies.operationalStore ?? createOperationalStore(environment);
  const store =
    dependencies.store ??
    createIngestionStore(
      environment,
      config.ingestionOutputDirectory,
      rawObjectStore,
    );
  const ownsOperationalStore =
    !dependencies.operationalStore && Boolean(operationalStore);
  const intelligenceRegistry = createDefaultIntelligenceRegistry();
  const signalRegistry = createDefaultSignalNormalizationRegistry();
  const results: ProviderRunResult[] = [];

  for (const registration of providerRegistry.registrations()) {
    const currentTime = now();
    if (
      !config.forceRefresh &&
      !(await isProviderDue(registration, currentTime, store))
    ) {
      results.push({
        providerId: registration.id,
        providerKind: registration.kind,
        status: "skipped",
        items: 0,
        signals: 0,
      });
      continue;
    }

    const runId = crypto.randomUUID();
    const requestedAt = currentTime.toISOString();
    const nextRunAt = new Date(
      currentTime.getTime() + registration.refreshMinutes * 60_000,
    ).toISOString();
    await operationalStore?.startIngestionRun?.({
      runId,
      providerId: registration.id,
      startedAt: requestedAt,
      nextRunAt,
    });
    logStructured({
      event: "ingestion.started",
      correlationId: runId,
      timestamp: requestedAt,
      attributes: {
        providerId: registration.id,
        providerKind: registration.kind,
        nextRunAt,
        parentCorrelationId: environment.DORA_PARENT_CORRELATION_ID,
      },
    });
    await store.markAttempted(registration.id, requestedAt);
    try {
      const fetched = await registration.provider.fetch(
        {},
        { correlationId: runId, requestedAt },
      );
      const rawBatch = {
        runId,
        providerId: registration.id,
        providerKind: registration.kind,
        fetchedAt: fetched.fetchedAt,
        ingestedAt: requestedAt,
        sourceVersion: fetched.sourceVersion,
        metadata: fetched.metadata,
        data: fetched.data,
      } as const;
      const rawBatchPath = rawObjectStore
        ? (
            await rawObjectStore.put({
              providerId: registration.id,
              runId,
              timestamp: requestedAt,
              contentType: "application/json",
              data: `${JSON.stringify({ schemaVersion: 1, layer: "raw", ...rawBatch })}\n`,
              metadata: {
                providerKind: registration.kind,
                fetchedAt: fetched.fetchedAt,
                ingestedAt: requestedAt,
              },
            })
          ).path
        : await store.writeRawBatch(rawBatch);
      const validation = await registration.provider.validate(fetched.data);
      if (!validation.valid) {
        throw new Error(
          validation.issues
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("; "),
        );
      }

      const normalized = await registration.provider.normalize(fetched.data, {
        correlationId: runId,
        requestedAt,
      });
      if (!normalized.every(isProvenanceItem)) {
        throw new Error("Normalized provider output is missing provenance.");
      }

      const normalizedBatchPath = await store.writeBatch({
        runId,
        providerId: registration.id,
        providerKind: registration.kind,
        ingestedAt: requestedAt,
        items: normalized,
      });
      const signals = signalRegistry.normalize(registration.type, normalized, {
        providerId: registration.id,
        refreshMinutes: registration.refreshMinutes,
        normalizedAt: requestedAt,
        rawBatchPath,
      });
      const signalBatchPath = await store.writeSignalBatch({
        runId,
        providerId: registration.id,
        providerKind: registration.kind,
        normalizedAt: requestedAt,
        rawBatchPath,
        normalizedBatchPath,
        signals,
      });
      await operationalStore?.upsertSignals(signals);
      const completedAt = now().toISOString();
      await operationalStore?.completeIngestionRun?.({
        runId,
        status: "completed",
        completedAt,
        fetchedItems: Array.isArray(fetched.data) ? fetched.data.length : 1,
        normalizedItems: normalized.length,
        signalItems: signals.length,
        rawPath: rawBatchPath,
        normalizedPath: normalizedBatchPath,
        signalPath: signalBatchPath,
        nextRunAt,
      });
      await store.writeRunRecord?.({
        runId,
        providerId: registration.id,
        startedAt: requestedAt,
        completedAt,
        status: "completed",
        fetchedRecords: Array.isArray(fetched.data) ? fetched.data.length : 1,
        normalizedRecords: normalized.length,
        signalRecords: signals.length,
        success: true,
        nextRunAt,
        rawPath: rawBatchPath,
        normalizedPath: normalizedBatchPath,
        signalPath: signalBatchPath,
      });
      logStructured({
        event: "ingestion.completed",
        correlationId: runId,
        timestamp: completedAt,
        success: true,
        durationMs: Math.max(
          0,
          Date.parse(completedAt) - Date.parse(requestedAt),
        ),
        attributes: {
          providerId: registration.id,
          fetchedRecords: Array.isArray(fetched.data) ? fetched.data.length : 1,
          normalizedRecords: normalized.length,
          signalRecords: signals.length,
          nextRunAt,
          parentCorrelationId: environment.DORA_PARENT_CORRELATION_ID,
        },
      });
      await store.markSuccessful(registration.id, completedAt);
      results.push({
        runId,
        providerId: registration.id,
        providerKind: registration.kind,
        status: "completed",
        items: normalized.length,
        signals: signals.length,
        rawBatchPath,
        normalizedBatchPath,
        signalBatchPath,
        nextRunAt,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown provider failure.";
      await operationalStore?.completeIngestionRun?.({
        runId,
        status: "failed",
        completedAt: now().toISOString(),
        fetchedItems: 0,
        normalizedItems: 0,
        signalItems: 0,
        errorMessage,
        nextRunAt,
      });
      await store.writeRunRecord?.({
        runId,
        providerId: registration.id,
        startedAt: requestedAt,
        completedAt: now().toISOString(),
        status: "failed",
        fetchedRecords: 0,
        normalizedRecords: 0,
        signalRecords: 0,
        success: false,
        error: errorMessage,
        nextRunAt,
      });
      logStructured({
        event: "ingestion.failed",
        correlationId: runId,
        timestamp: new Date().toISOString(),
        success: false,
        attributes: {
          providerId: registration.id,
          nextRunAt,
          parentCorrelationId: environment.DORA_PARENT_CORRELATION_ID,
        },
        error: {
          type: error instanceof Error ? error.name : "UnknownError",
          message: errorMessage,
        },
      });
      results.push({
        runId,
        providerId: registration.id,
        providerKind: registration.kind,
        status: "failed",
        items: 0,
        signals: 0,
        error: errorMessage,
        nextRunAt,
      });
    }
  }

  const completedProviders = results.filter(
    (result) => result.status === "completed",
  ).length;
  const skippedProviders = results.filter(
    (result) => result.status === "skipped",
  ).length;
  const failedProviders = results.filter(
    (result) => result.status === "failed",
  ).length;

  if (ownsOperationalStore) {
    await operationalStore?.close();
  }

  return {
    status: pipelineStatus(results, completedProviders, failedProviders),
    startedAt,
    completedAt: now().toISOString(),
    providers: results.length,
    completedProviders,
    skippedProviders,
    failedProviders,
    observations: results.reduce((count, result) => count + result.items, 0),
    signals: results.reduce((count, result) => count + result.signals, 0),
    intelligenceDomains: intelligenceRegistry.list().length,
    results,
  };
}

function createRawObjectStore(
  environment: Record<string, string | undefined>,
): RawObjectStore | undefined {
  const endpoint = environment.AZURE_STORAGE_BLOB_ENDPOINT;
  return endpoint
    ? new AzureBlobObjectStore(
        endpoint,
        environment.AZURE_STORAGE_CONTAINER ?? "dora-data",
      )
    : undefined;
}

function createIngestionStore(
  environment: Record<string, string | undefined>,
  localDirectory: string,
  rawObjectStore: RawObjectStore | undefined,
): IngestionStore {
  const postgres = postgresConfigFromEnvironment(environment);
  if (rawObjectStore && postgres) {
    return new AzureIngestionStore(
      rawObjectStore,
      new PostgresRuntimeStateStore(postgres),
    );
  }
  if ((environment.NODE_ENV ?? process.env.NODE_ENV) === "production") {
    throw new Error(
      "Blob Storage and PostgreSQL ingestion state are required in production.",
    );
  }
  return new JsonFileIngestionStore(localDirectory);
}

function createOperationalStore(
  environment: Record<string, string | undefined>,
): OperationalStore | undefined {
  const host = environment.PGHOST;
  const database = environment.PGDATABASE;
  const user = environment.PGUSER;
  if (!host || !database || !user) return undefined;
  return new PostgresOperationalStore({
    host,
    database,
    user,
    port: Number(environment.PGPORT ?? 5432),
    password: environment.PGPASSWORD,
    useEntraIdentity: environment.PG_USE_ENTRA_IDENTITY !== "false",
    ssl: environment.PGSSL !== "false",
  });
}

async function isProviderDue(
  registration: ProviderRegistration,
  currentTime: Date,
  store: IngestionStore,
): Promise<boolean> {
  const lastAttempt = await store.lastAttemptedRun(registration.id);
  if (!lastAttempt) {
    return true;
  }
  return (
    currentTime.getTime() - Date.parse(lastAttempt) >=
    registration.refreshMinutes * 60_000
  );
}

function isProvenanceItem(value: unknown): value is ProvenanceItem {
  if (!value || typeof value !== "object") {
    return false;
  }
  const provenance = (value as { provenance?: DataProvenance }).provenance;
  return Boolean(
    provenance?.providerId &&
    provenance.sourceId &&
    provenance.sourceTimestamp &&
    provenance.fetchedAt &&
    provenance.ingestedAt,
  );
}

function pipelineStatus(
  results: readonly ProviderRunResult[],
  completed: number,
  failed: number,
): PipelineRunSummary["status"] {
  if (
    !results.length ||
    results.every((result) => result.status === "skipped")
  ) {
    return "idle";
  }
  if (failed === 0) {
    return "completed";
  }
  return completed > 0 ? "partial" : "failed";
}
