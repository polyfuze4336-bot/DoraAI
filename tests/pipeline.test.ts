import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runPipeline } from "@dora/pipeline";
import {
  JsonFileIngestionStore,
  type IngestionBatch,
  type IngestionStore,
  type RawIngestionBatch,
  type SignalIngestionBatch,
} from "@dora/pipeline/ingestion-store";

const runtime = {
  timeoutMs: 1_000,
  retry: { maxAttempts: 1, baseDelayMs: 10, maxDelayMs: 100 },
  rateLimit: { requests: 100, perMilliseconds: 100 },
};

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })),
  );
});

class MemoryIngestionStore implements IngestionStore {
  readonly batches: IngestionBatch[] = [];
  readonly rawBatches: RawIngestionBatch[] = [];
  readonly signalBatches: SignalIngestionBatch[] = [];
  readonly successes = new Map<string, string>();
  readonly attempts = new Map<string, string>();

  async writeRawBatch(batch: RawIngestionBatch): Promise<string> {
    this.rawBatches.push(batch);
    return `memory://raw/${batch.providerId}/${batch.runId}`;
  }

  async writeBatch(batch: IngestionBatch): Promise<string> {
    this.batches.push(batch);
    return `memory://normalized/${batch.providerId}/${batch.runId}`;
  }

  async writeSignalBatch(batch: SignalIngestionBatch): Promise<string> {
    this.signalBatches.push(batch);
    return `memory://signals/${batch.providerId}/${batch.runId}`;
  }

  async lastAttemptedRun(providerId: string): Promise<string | undefined> {
    return this.attempts.get(providerId);
  }

  async markAttempted(providerId: string, attemptedAt: string): Promise<void> {
    this.attempts.set(providerId, attemptedAt);
  }

  async markSuccessful(providerId: string, completedAt: string): Promise<void> {
    this.successes.set(providerId, completedAt);
  }
}

function gdeltDefinition(id: string, query: string) {
  return {
    id,
    type: "gdelt",
    enabled: true,
    refreshMinutes: 30,
    baseUrl: "https://api.example.test",
    timespan: "24h",
    maxRecords: 5,
    runtime,
    queries: {
      market: { query, commodityIds: ["crude-oil-wti"] },
    },
  };
}

describe("configuration-driven pipeline", () => {
  it("runs idle when the registry has no enabled providers", async () => {
    await expect(runPipeline({ PROVIDER_CONFIG_JSON: "[]" })).resolves.toEqual(
      expect.objectContaining({
        status: "idle",
        providers: 0,
        observations: 0,
        intelligenceDomains: 5,
      }),
    );
  });

  it("fails fast when an enabled keyed provider has no referenced secret", async () => {
    const providers = [
      {
        id: "eia-test",
        type: "eia",
        enabled: true,
        refreshMinutes: 60,
        authentication: { type: "apiKey", apiKeyEnv: "EIA_API_KEY" },
        runtime,
        series: {
          "PET.RWTC.D": {
            commodityId: "wti",
            symbol: "WTI",
            name: "WTI",
            currency: "USD",
            unit: "barrel",
          },
        },
      },
    ];

    await expect(
      runPipeline({ PROVIDER_CONFIG_JSON: JSON.stringify(providers) }),
    ).rejects.toThrow("EIA_API_KEY is required");
  });

  it("skips providers until their configured refresh interval elapses", async () => {
    const store = new MemoryIngestionStore();
    store.attempts.set("gdelt-test", "2026-08-17T11:45:00.000Z");
    const fetchImplementation = vi.fn<typeof fetch>();

    const result = await runPipeline(
      {
        PROVIDER_CONFIG_JSON: JSON.stringify([
          gdeltDefinition("gdelt-test", "energy market"),
        ]),
      },
      {
        store,
        fetchImplementation,
        now: () => new Date("2026-08-17T12:00:00.000Z"),
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: "idle",
        providers: 1,
        skippedProviders: 1,
      }),
    );
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("isolates provider failures and persists successful provenance batches", async () => {
    const store = new MemoryIngestionStore();
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) => {
        const query = new URL(String(input)).searchParams.get("query");
        if (query === "failing market") {
          return new Response("unavailable", { status: 503 });
        }
        return Response.json({
          articles: [
            {
              url: "https://news.example.test/story",
              title: "Supply update",
              seendate: "20260817T114500Z",
              domain: "news.example.test",
            },
          ],
        });
      });

    const result = await runPipeline(
      {
        PROVIDER_CONFIG_JSON: JSON.stringify([
          gdeltDefinition("gdelt-success", "successful market"),
          gdeltDefinition("gdelt-failure", "failing market"),
        ]),
        PROVIDER_FORCE_REFRESH: "true",
      },
      {
        store,
        fetchImplementation,
        now: () => new Date("2026-08-17T12:00:00.000Z"),
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: "partial",
        completedProviders: 1,
        failedProviders: 1,
        observations: 1,
        signals: 1,
      }),
    );
    expect(store.rawBatches).toHaveLength(1);
    expect(store.batches).toHaveLength(1);
    expect(store.signalBatches).toHaveLength(1);
    expect(store.batches[0]?.items[0]?.provenance).toEqual(
      expect.objectContaining({
        providerId: "gdelt-success",
        sourceTimestamp: "2026-08-17T11:45:00.000Z",
        ingestedAt: "2026-08-17T12:00:00.000Z",
      }),
    );
    expect(store.signalBatches[0]?.signals[0]).toEqual(
      expect.objectContaining({
        signalType: "NEWS",
        provider: "gdelt-success",
        rawReference: expect.objectContaining({
          rawBatchPath: expect.stringContaining("memory://raw/gdelt-success"),
        }),
      }),
    );
  });

  it("atomically stores provenance-bearing normalized batches", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dora-ingestion-"));
    temporaryDirectories.push(directory);
    const store = new JsonFileIngestionStore(directory);
    const batch: IngestionBatch = {
      runId: "run-1",
      providerId: "provider-1",
      providerKind: "news",
      ingestedAt: "2026-08-17T12:00:00.000Z",
      items: [
        {
          provenance: {
            providerId: "provider-1",
            sourceId: "source-1",
            sourceUrl: "https://example.test/source",
            sourceTimestamp: "2026-08-17T11:45:00.000Z",
            fetchedAt: "2026-08-17T11:46:00.000Z",
            ingestedAt: "2026-08-17T12:00:00.000Z",
            correlationId: "run-1",
            license: "test",
            termsUrl: "https://example.test/terms",
          },
        },
      ],
    };

    const outputPath = await store.writeBatch(batch);
    const stored = JSON.parse(await readFile(outputPath, "utf8")) as {
      itemCount: number;
      items: IngestionBatch["items"];
    };

    expect(stored.itemCount).toBe(1);
    expect(stored.items[0]?.provenance.sourceId).toBe("source-1");
  });
});
