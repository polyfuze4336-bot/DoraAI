import { describe, expect, it } from "vitest";

import { DriftBaselineForecastEngine } from "@dora/forecasting";
import { createDefaultIntelligenceRegistry } from "@dora/intelligence";
import { intelligenceDomains } from "@dora/shared";

describe("modular intelligence services", () => {
  it("registers exactly the five required domains", () => {
    const registry = createDefaultIntelligenceRegistry();

    expect(
      registry
        .list()
        .map((service) => service.domain)
        .sort(),
    ).toEqual([...intelligenceDomains].sort());
  });

  it("rejects a request routed to the wrong domain service", async () => {
    const service = createDefaultIntelligenceRegistry().get("commodity-price");

    await expect(
      service.analyse(
        {
          domain: "emerging-risk",
          commodityIds: ["crude-oil-wti"],
          geographyIds: [],
          asOf: "2026-08-17T00:00:00.000Z",
          horizonDays: 30,
        },
        {
          generatedAt: "2026-08-17T00:00:00.000Z",
          freshness: "fresh",
          metrics: [],
          signals: [],
          evidence: [],
        },
      ),
    ).rejects.toThrow("Expected commodity-price request");
  });
});

describe("deterministic forecasting", () => {
  it("produces a drift baseline without model reasoning", async () => {
    const engine = new DriftBaselineForecastEngine();
    const result = await engine.forecast({
      seriesId: "wti",
      horizon: 2,
      intervalDays: 1,
      observations: [
        { observedAt: "2026-08-14T00:00:00.000Z", value: 70 },
        { observedAt: "2026-08-15T00:00:00.000Z", value: 72 },
        { observedAt: "2026-08-16T00:00:00.000Z", value: 74 },
      ],
    });

    expect(result.engine).toBe("drift-baseline-v1");
    expect(result.points.map((point) => point.value)).toEqual([76, 78]);
  });
});
