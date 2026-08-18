import { describe, expect, it } from "vitest";

import {
  assessSourceQuality,
  DeterministicScenarioEngine,
  DoraAlertEngine,
} from "@dora/intelligence";

describe("deterministic scenario analysis", () => {
  it("calculates management sensitivities with explicit assumptions", () => {
    const result = new DeterministicScenarioEngine().calculate(
      {
        brentPriceChangePercent: 10,
        manufacturingDemandChangePercent: -5,
        shippingDisruptionPercent: 40,
        shippingDisruptionDurationDays: 30,
        usdStrengthChangePercent: 5,
      },
      {
        brentPrice: 84.16,
        feedstockCostIndex: 100,
        freightCostIndex: 100,
        manufacturingDemandIndex: 100,
        inventoryDays: 18,
      },
    );
    expect(result.calculated.brentPrice).toBeCloseTo(92.58);
    expect(result.changes.feedstockCostPercent).toBeCloseTo(11.3);
    expect(result.risks).toContain(
      "Shipping lead-time and freight premium escalation",
    );
    expect(result.assumptions).toHaveLength(3);
  });
});

describe("alert deduplication", () => {
  it("updates a matching open alert instead of creating alert noise", () => {
    const engine = new DoraAlertEngine({
      cooldownMinutes: 240,
      maximumOpenAlertsPerKey: 1,
    });
    const candidate = {
      type: "price-movement" as const,
      severity: "high" as const,
      commodity: "Brent",
      reason: "Brent moved more than 5%.",
      timestamp: "2026-08-17T10:00:00.000Z",
      evidence: ["price-1"],
      recommendedNextAction: "Review feedstock exposure.",
      deduplicationKey: "price:brent:5pct",
    };
    const first = engine.evaluate(candidate, []).alert!;
    const second = engine.evaluate(
      {
        ...candidate,
        timestamp: "2026-08-17T11:00:00.000Z",
        evidence: ["price-2"],
      },
      [first],
    );
    expect(second.deduplicated).toBe(true);
    expect(second.alert?.occurrenceCount).toBe(2);
    expect(second.alert?.evidence).toEqual(["price-1", "price-2"]);
    expect(engine.acknowledge(second.alert!, "manager").status).toBe(
      "acknowledged",
    );
  });
});

describe("source quality", () => {
  it("scores reliability separately from directional forecast support", () => {
    const assessment = assessSourceQuality(
      {
        sourceId: "source-a",
        configuredReliability: 0.9,
        freshness: 0.8,
        completeness: 0.7,
        corroboration: 0.6,
        historicalSignalQuality: 0.75,
      },
      "2026-08-17T12:00:00.000Z",
    );
    expect(assessment.qualityScore).toBeCloseTo(0.7775);
    expect(assessment.grade).toBe("B");
    expect(assessment.caveat).toContain("does not measure agreement");
  });
});
