import { describe, expect, it, vi } from "vitest";

import { DriftBaselineForecastEngine } from "@dora/forecasting";
import {
  DoraIntelligenceEngine,
  type IntelligenceInterpreter,
} from "@dora/intelligence";
import type { DoraSignal, SignalType } from "@dora/shared";

const asOf = "2026-08-17T12:00:00.000Z";

const priceSignals = [
  signal("price-1", "PRICE", "2026-08-14T12:00:00.000Z", 70),
  signal("price-2", "PRICE", "2026-08-15T12:00:00.000Z", 72),
  signal("price-3", "PRICE", "2026-08-16T12:00:00.000Z", 75),
];

const supplyDriver = signal(
  "supply-1",
  "SUPPLY",
  "2026-08-15T06:00:00.000Z",
  0.8,
  "Mine disruption reduced available supply",
);

describe("DORA intelligence engine", () => {
  it("executes the requested stages with explicit evidence classifications", async () => {
    const engine = new DoraIntelligenceEngine({
      forecastEngine: new DriftBaselineForecastEngine(),
    });

    const result = await engine.run({
      signals: [...priceSignals, supplyDriver],
      asOf,
      forecastHorizon: 2,
      forecastIntervalDays: 1,
    });

    expect(result.stages.map((stage) => stage.name)).toEqual([
      "collect",
      "validate",
      "normalize",
      "score-freshness",
      "detect-anomalies",
      "calculate-trend",
      "detect-correlation",
      "identify-potential-causal-drivers",
      "retrieve-supporting-research",
      "generate-hypotheses",
      "generate-forecast-context",
      "generate-management-insight",
    ]);
    expect(result.facts.classification).toBe("FACT");
    expect(result.trends.classification).toBe("CALCULATION");
    expect(result.correlations.classification).toBe("CALCULATION");
    expect(result.forecasts[0]?.classification).toBe("MODEL_FORECAST");
    expect(result.forecasts[0]?.method).toBe("drift-baseline-v1");
    expect(result.hypotheses.classification).toBe("CALCULATION");
    expect(result.aiInterpretation).toBeUndefined();
    expect(result.potentialDrivers.data[0]?.caveat).toContain(
      "do not establish causation",
    );
    expect(result.sourceQuality.classification).toBe("CALCULATION");
    expect(result.sourceQuality.data[0]?.caveat).toContain(
      "does not measure agreement",
    );
  });

  it("labels LLM reasoning separately without replacing mathematical forecasts", async () => {
    const interpret = vi
      .fn<IntelligenceInterpreter["interpret"]>()
      .mockResolvedValue({
        hypotheses: [
          {
            statement:
              "Supply disruption may contribute to upward price pressure.",
            confidence: 0.61,
            supportingSignalIds: ["supply-1"],
            supportingDocumentIds: [],
            falsificationCriteria: ["Prices fall while disruption persists."],
          },
        ],
        managementInsight: {
          headline: "Review copper exposure",
          summary: "Supply evidence may warrant scenario review.",
          recommendations: ["Review purchasing thresholds."],
          scenarioInterpretations: ["Test a prolonged disruption scenario."],
          citations: [],
        },
      });
    const interpreter: IntelligenceInterpreter = {
      id: "test-llm-interpreter",
      interpret,
    };
    const engine = new DoraIntelligenceEngine({
      forecastEngine: new DriftBaselineForecastEngine(),
      interpreter,
    });

    const result = await engine.run({
      signals: [...priceSignals, supplyDriver],
      asOf,
      forecastHorizon: 2,
      forecastIntervalDays: 1,
    });

    expect(interpret).toHaveBeenCalledOnce();
    expect(result.hypotheses.classification).toBe("AI_INTERPRETATION");
    expect(result.managementInsight.classification).toBe("AI_INTERPRETATION");
    expect(result.aiInterpretation?.classification).toBe("AI_INTERPRETATION");
    expect(result.forecasts[0]).toMatchObject({
      classification: "MODEL_FORECAST",
      method: "drift-baseline-v1",
    });
    expect(result.trends.classification).toBe("CALCULATION");
  });

  it("rejects invalid canonical signals before calculations", async () => {
    const engine = new DoraIntelligenceEngine({
      forecastEngine: new DriftBaselineForecastEngine(),
    });
    const invalid = { ...priceSignals[0], confidence: 2 } as DoraSignal;

    await expect(engine.run({ signals: [invalid], asOf })).rejects.toThrow(
      "failed canonical validation",
    );
  });
});

function signal(
  signalId: string,
  signalType: SignalType,
  timestamp: string,
  value: number,
  headline = `${signalType} signal`,
): DoraSignal {
  return {
    signalId,
    signalType,
    source: "test-source",
    provider: "test-provider",
    commodity: { id: "copper", symbol: "CU", name: "Copper" },
    region: "Global",
    timestamp,
    ingestedAt: asOf,
    value,
    unit: signalType === "PRICE" ? "USD/tonne" : "index",
    direction: value > 0 ? "UP" : "FLAT",
    magnitude: 0.5,
    sentiment: "NEUTRAL",
    relevance: 0.8,
    confidence: 0.9,
    freshness: {
      status: "fresh",
      ageMinutes: 60,
      expectedRefreshMinutes: 1_440,
      assessedAt: asOf,
    },
    headline,
    description: headline,
    sourceUrl: `https://example.test/${signalId}`,
    metadata: {},
    provenance: {
      providerId: "test-provider",
      sourceId: signalId,
      sourceUrl: `https://example.test/${signalId}`,
      sourceTimestamp: timestamp,
      fetchedAt: asOf,
      ingestedAt: asOf,
      correlationId: "test-run",
      license: "test",
      termsUrl: "https://example.test/terms",
      rawChecksum: signalId.padEnd(64, "a").slice(0, 64),
    },
    rawReference: {
      providerId: "test-provider",
      externalId: signalId,
      sourceId: signalId,
      rawChecksum: signalId.padEnd(64, "a").slice(0, 64),
      rawBatchPath: `raw/test/${signalId}.json`,
    },
  };
}
