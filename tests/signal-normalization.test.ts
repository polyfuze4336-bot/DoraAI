import { describe, expect, it } from "vitest";

import { createDefaultSignalNormalizationRegistry } from "@dora/normalization";
import {
  doraSignalSchema,
  signalTypes,
  type CommodityObservation,
  type DataProvenance,
  type MarketIntelligenceRecord,
  type NewsItem,
} from "@dora/shared";

const ingestedAt = "2026-08-17T12:00:00.000Z";
const rawBatchPath = "memory://raw/provider/run-1";

function provenance(
  providerId: string,
  sourceId: string,
  sourceTimestamp: string,
): DataProvenance {
  return {
    providerId,
    sourceId,
    sourceUrl: `https://example.test/${sourceId}`,
    sourceTimestamp,
    fetchedAt: "2026-08-17T11:59:00.000Z",
    ingestedAt,
    correlationId: "run-1",
    license: "test licence",
    termsUrl: "https://example.test/terms",
    rawChecksum: "a".repeat(64),
  };
}

function priceObservation(
  providerId: string,
  externalId: string,
  observedAt: string,
  price: number,
): CommodityObservation {
  return {
    providerId,
    externalId,
    commodityId: "crude-oil-wti",
    symbol: "WTI",
    name: "WTI crude oil",
    observedAt,
    retrievedAt: ingestedAt,
    price,
    currency: "USD",
    unit: "barrel",
    geography: "United States",
    provenance: provenance(providerId, "WTI", observedAt),
  };
}

const context = {
  providerId: "provider-test",
  refreshMinutes: 60,
  normalizedAt: ingestedAt,
  rawBatchPath,
};

describe("canonical DORA signal normalization", () => {
  it("supports the complete canonical signal taxonomy", () => {
    expect(signalTypes).toEqual([
      "PRICE",
      "NEWS",
      "RISK",
      "MARKET_INTELLIGENCE",
      "MANUFACTURING",
      "MACRO",
      "SUPPLY",
      "DEMAND",
      "INVENTORY",
      "GEOPOLITICAL",
      "WEATHER",
      "SHIPPING",
    ]);
  });

  it.each([
    ["eia", "U.S. Energy Information Administration"],
    ["world-bank-pink-sheet", "World Bank Pink Sheet"],
  ] as const)(
    "normalizes %s price history with movement",
    (providerType, source) => {
      const registry = createDefaultSignalNormalizationRegistry();
      const first = priceObservation(
        "provider-test",
        "WTI:2026-08-16",
        "2026-08-16T12:00:00.000Z",
        80,
      );
      const second = priceObservation(
        "provider-test",
        "WTI:2026-08-17",
        "2026-08-17T11:00:00.000Z",
        84,
      );

      const signals = registry.normalize(
        providerType,
        [second, first],
        context,
      );

      expect(signals).toHaveLength(2);
      expect(signals[1]).toEqual(
        expect.objectContaining({
          signalType: "PRICE",
          source,
          commodity: expect.objectContaining({ id: "crude-oil-wti" }),
          direction: "UP",
          magnitude: 0.05,
          value: 84,
          unit: "USD/barrel",
          freshness: expect.objectContaining({ status: "fresh" }),
          provenance: second.provenance,
          rawReference: expect.objectContaining({
            rawBatchPath,
            rawChecksum: "a".repeat(64),
          }),
        }),
      );
      expect(() => doraSignalSchema.parse(signals[1])).not.toThrow();
      expect(
        registry.normalize(providerType, [second, first], context)[1]?.signalId,
      ).toBe(signals[1]?.signalId);
    },
  );

  it("normalizes FRED records as MACRO signals", () => {
    const registry = createDefaultSignalNormalizationRegistry();
    const records: MarketIntelligenceRecord[] = [100, 103].map(
      (value, index) => ({
        providerId: "fred-test",
        externalId: `INDPRO:2026-0${index + 6}-01:2026-08-17`,
        title: "Industrial Production",
        body: JSON.stringify({
          seriesId: "INDPRO",
          value,
          unit: "index",
          realtimeStart: "2026-08-17",
          realtimeEnd: "2026-08-17",
        }),
        effectiveAt: `2026-0${index + 6}-01T00:00:00.000Z`,
        retrievedAt: ingestedAt,
        commodityIds: [],
        provenance: provenance(
          "fred-test",
          "INDPRO",
          `2026-0${index + 6}-01T00:00:00.000Z`,
        ),
      }),
    );

    const signals = registry.normalize("fred", records, {
      ...context,
      providerId: "fred-test",
      refreshMinutes: 360,
    });

    expect(signals[1]).toEqual(
      expect.objectContaining({
        signalType: "MACRO",
        direction: "UP",
        sentiment: "POSITIVE",
        magnitude: 0.03,
        metadata: expect.objectContaining({ seriesId: "INDPRO" }),
        provenance: records[1]?.provenance,
      }),
    );
  });

  it("normalizes GDELT items without invented sentiment", () => {
    const registry = createDefaultSignalNormalizationRegistry();
    const articleProvenance = provenance(
      "gdelt-test",
      "article-1",
      "2026-08-17T11:45:00.000Z",
    );
    const article: NewsItem = {
      providerId: "gdelt-test",
      externalId: "https://news.example.test/article-1",
      headline: "Crude supply routes face delays",
      summary: "news.example.test | United States | English",
      publishedAt: "2026-08-17T11:45:00.000Z",
      retrievedAt: ingestedAt,
      sourceUrl: "https://news.example.test/article-1",
      commodityIds: ["crude-oil-wti"],
      provenance: articleProvenance,
    };

    const [signal] = registry.normalize("gdelt", [article], {
      ...context,
      providerId: "gdelt-test",
      refreshMinutes: 30,
    });

    expect(signal).toEqual(
      expect.objectContaining({
        signalType: "NEWS",
        direction: "UNKNOWN",
        sentiment: "UNKNOWN",
        magnitude: null,
        relevance: 0.82,
        confidence: 0.7,
        freshness: expect.objectContaining({ status: "fresh" }),
        provenance: articleProvenance,
      }),
    );
  });

  it("rejects unsupported providers instead of losing records", () => {
    const registry = createDefaultSignalNormalizationRegistry();
    expect(() => registry.normalize("reuters", [], context)).toThrow(
      "No canonical signal normalizer",
    );
  });
});
