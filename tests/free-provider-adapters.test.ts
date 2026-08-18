import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  createConfiguredProviderRegistry,
  FredMarketIntelligenceProvider,
  GdeltNewsProvider,
  parseProviderDefinitions,
  WorldBankPinkSheetProvider,
  type FredProviderDefinition,
  type GdeltProviderDefinition,
  type WorldBankProviderDefinition,
  type WorldBankPinkSheetPayload,
} from "@dora/connectors";

const runtime = {
  timeoutMs: 1_000,
  retry: { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 100 },
  rateLimit: { requests: 100, perMilliseconds: 100 },
};

const context = {
  correlationId: "provider-test",
  requestedAt: "2026-08-17T00:00:00.000Z",
};

describe("free prototype provider adapters", () => {
  it("normalizes FRED observations with revision and provenance metadata", async () => {
    const definition: FredProviderDefinition = {
      id: "fred-test",
      type: "fred",
      enabled: true,
      refreshMinutes: 360,
      baseUrl: "https://api.example.test",
      authentication: { type: "apiKey", apiKeyEnv: "FRED_API_KEY" },
      observationsPerSeries: 10,
      runtime,
      series: {
        INDPRO: {
          title: "Industrial Production",
          unit: "index",
          commodityIds: [],
        },
      },
    };
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        realtime_start: "2026-08-17",
        realtime_end: "2026-08-17",
        observations: [
          {
            realtime_start: "2026-08-17",
            realtime_end: "2026-08-17",
            date: "2026-07-01",
            value: "102.4",
          },
          {
            realtime_start: "2026-08-17",
            realtime_end: "2026-08-17",
            date: "2026-06-01",
            value: ".",
          },
        ],
      }),
    );
    const provider = new FredMarketIntelligenceProvider(
      { ...definition, apiKey: "fred-secret" },
      fetchImplementation,
    );

    const fetched = await provider.fetch({}, context);
    const normalized = await provider.normalize(fetched.data, context);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toEqual(
      expect.objectContaining({
        externalId: "INDPRO:2026-07-01:2026-08-17",
        effectiveAt: "2026-07-01T00:00:00.000Z",
        provenance: expect.objectContaining({
          sourceId: "INDPRO",
          sourceTimestamp: "2026-07-01T00:00:00.000Z",
          ingestedAt: context.requestedAt,
        }),
      }),
    );
    expect(fetched.data[0]?.sourceUrl).not.toContain("fred-secret");
  });

  it("normalizes and deduplicates GDELT articles with source timestamps", async () => {
    const definition: GdeltProviderDefinition = {
      id: "gdelt-test",
      type: "gdelt",
      enabled: true,
      refreshMinutes: 30,
      baseUrl: "https://api.example.test",
      timespan: "24h",
      maxRecords: 20,
      runtime,
      queries: {
        energy: {
          query: "crude oil supply",
          commodityIds: ["crude-oil-wti"],
        },
      },
    };
    const article = {
      url: "https://news.example.test/energy",
      title: "Energy supply update",
      seendate: "20260817T114500Z",
      domain: "news.example.test",
      language: "English",
      sourcecountry: "United States",
    };
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ articles: [article, article] }));
    const provider = new GdeltNewsProvider(definition, fetchImplementation);

    const fetched = await provider.fetch({}, context);
    const normalized = await provider.normalize(fetched.data, context);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toEqual(
      expect.objectContaining({
        headline: "Energy supply update",
        publishedAt: "2026-08-17T11:45:00.000Z",
        commodityIds: ["crude-oil-wti"],
        provenance: expect.objectContaining({
          providerId: "gdelt-test",
          sourceTimestamp: "2026-08-17T11:45:00.000Z",
        }),
      }),
    );
  });

  it("rejects malformed GDELT article schemas before normalization", async () => {
    const definition: GdeltProviderDefinition = {
      id: "gdelt-invalid",
      type: "gdelt",
      enabled: true,
      refreshMinutes: 30,
      baseUrl: "https://api.example.test",
      timespan: "24h",
      maxRecords: 20,
      runtime,
      queries: {
        energy: { query: "crude oil supply", commodityIds: [] },
      },
    };
    const provider = new GdeltNewsProvider(
      definition,
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ articles: [{ title: "Missing URL and timestamp" }] }),
        ),
    );

    await expect(provider.fetch({}, context)).rejects.toThrow();
  });

  it("normalizes configured Pink Sheet columns and skips missing markers", async () => {
    const definition: WorldBankProviderDefinition = {
      id: "pink-sheet-test",
      type: "world-bank-pink-sheet",
      enabled: true,
      refreshMinutes: 1_440,
      downloadUrl: "https://example.test/pink-sheet.xlsx",
      sheetName: "Monthly Prices",
      maxMonths: 12,
      runtime,
      columns: {
        Copper: {
          commodityId: "copper",
          symbol: "CU",
          name: "Copper",
          currency: "USD",
          unit: "tonne",
          geography: "Global",
        },
      },
    };
    const provider = new WorldBankPinkSheetProvider(definition, vi.fn());
    const payload: WorldBankPinkSheetPayload = {
      headers: ["Copper"],
      units: { Copper: "($/mt)" },
      rows: [
        { period: "2026M06", values: { Copper: "…" } },
        { period: "2026M07", values: { Copper: 9_842.5 } },
      ],
      sourceUpdatedAt: "2026-08-04T00:00:00.000Z",
      sourceUrl: definition.downloadUrl,
      fetchedAt: "2026-08-17T00:00:01.000Z",
    };

    const validation = await provider.validate(payload);
    const normalized = await provider.normalize(payload, context);

    expect(validation.valid).toBe(true);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toEqual(
      expect.objectContaining({
        commodityId: "copper",
        observedAt: "2026-07-01T00:00:00.000Z",
        publishedAt: "2026-08-04T00:00:00.000Z",
        price: 9_842.5,
        provenance: expect.objectContaining({
          sourceId: "Copper",
          sourceTimestamp: "2026-07-01T00:00:00.000Z",
        }),
      }),
    );
  });

  it("parses the committed registry without credential values", () => {
    const raw = JSON.parse(
      readFileSync("config/providers.json", "utf8"),
    ) as unknown;
    const definitions = parseProviderDefinitions(raw);

    expect(definitions.map((definition) => definition.type)).toEqual([
      "eia",
      "fred",
      "world-bank-pink-sheet",
      "gdelt",
    ]);
    expect(JSON.stringify(definitions)).not.toContain("fred-secret");
    expect(JSON.stringify(definitions)).not.toMatch(/apiKey\s*:/);
  });

  it("requires the referenced secret only when a keyed provider is enabled", () => {
    const [eia] = parseProviderDefinitions([
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
    ]);

    expect(() =>
      createConfiguredProviderRegistry(eia ? [eia] : [], { environment: {} }),
    ).toThrow("EIA_API_KEY is required");
  });
});
