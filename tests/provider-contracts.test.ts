import { describe, expect, it, vi } from "vitest";

import {
  EiaCommodityPriceProvider,
  ProviderRegistry,
  type EiaSeriesPayload,
} from "@dora/connectors";

const providerConfig = {
  apiKey: "test-key",
  baseUrl: "https://api.example.test",
  runtime: {
    timeoutMs: 1_000,
    retry: { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 100 },
    rateLimit: { requests: 100, perMilliseconds: 100 },
  },
  series: {
    "PET.RWTC.D": {
      commodityId: "crude-oil-wti",
      symbol: "WTI",
      name: "West Texas Intermediate",
      currency: "USD",
      unit: "barrel",
      geography: "United States",
    },
  },
};

describe("provider contracts", () => {
  it("registers providers by kind and id", () => {
    const provider = new EiaCommodityPriceProvider(providerConfig, vi.fn());
    const registry = new ProviderRegistry();

    registry.register(provider);

    expect(registry.get("commodity-price", "eia")).toBe(provider);
    expect(registry.list("commodity-price")).toHaveLength(1);
  });

  it("rejects duplicate provider registration", () => {
    const provider = new EiaCommodityPriceProvider(providerConfig, vi.fn());
    const registry = new ProviderRegistry();

    registry.register(provider);

    expect(() => registry.register(provider)).toThrow(
      "Provider already registered",
    );
  });

  it("validates and normalizes EIA observations", async () => {
    const provider = new EiaCommodityPriceProvider(providerConfig, vi.fn());
    const payload: readonly EiaSeriesPayload[] = [
      {
        seriesId: "PET.RWTC.D",
        sourceUrl:
          "https://api.example.test/v2/seriesid/PET.RWTC.D?api_key=REDACTED",
        fetchedAt: "2026-08-17T00:00:01.000Z",
        payload: {
          response: {
            data: [{ period: "20260815", value: "78.42" }],
          },
        },
      },
    ];

    await expect(provider.validate(payload)).resolves.toEqual({
      valid: true,
      issues: [],
    });
    await expect(
      provider.normalize(payload, {
        correlationId: "test-correlation",
        requestedAt: "2026-08-17T00:00:00.000Z",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        commodityId: "crude-oil-wti",
        observedAt: "2026-08-15T00:00:00.000Z",
        price: 78.42,
        currency: "USD",
        unit: "barrel",
        provenance: expect.objectContaining({
          providerId: "eia",
          sourceId: "PET.RWTC.D",
          sourceTimestamp: "2026-08-15T00:00:00.000Z",
          ingestedAt: "2026-08-17T00:00:00.000Z",
          rawChecksum: expect.any(String),
        }),
      }),
    ]);
  });

  it("fetches configured series through the injected HTTP boundary", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          response: { data: [{ period: "20260815", value: 78.42 }] },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const provider = new EiaCommodityPriceProvider(
      providerConfig,
      fetchImplementation,
    );

    const result = await provider.fetch(
      { commodityIds: ["crude-oil-wti"] },
      {
        correlationId: "fetch-test",
        requestedAt: "2026-08-17T00:00:00.000Z",
      },
    );

    expect(result.data).toHaveLength(1);
    expect(fetchImplementation).toHaveBeenCalledOnce();
    expect(String(fetchImplementation.mock.calls[0]?.[0])).toContain(
      "PET.RWTC.D",
    );
    expect(result.data[0]?.sourceUrl).not.toContain("test-key");
  });

  it("reports provider health with the latest source timestamp", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        response: { data: [{ period: "20260815", value: "78.42" }] },
      }),
    );
    const provider = new EiaCommodityPriceProvider(
      providerConfig,
      fetchImplementation,
    );

    await expect(provider.healthCheck()).resolves.toEqual(
      expect.objectContaining({
        providerId: "eia",
        status: "healthy",
        lastSourceTimestamp: "2026-08-15T00:00:00.000Z",
        consecutiveFailures: 0,
      }),
    );
  });
});
