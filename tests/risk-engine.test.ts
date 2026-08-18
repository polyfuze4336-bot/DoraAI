import { describe, expect, it } from "vitest";

import { DeterministicRiskEngine } from "@dora/intelligence";

describe("deterministic emerging risk engine", () => {
  it("scores risk only from normalized inputs and retains evidence", () => {
    const risk = new DeterministicRiskEngine().score({
      riskId: "shipping-1",
      title: "Gulf shipping disruption",
      description: "Transit capacity may tighten.",
      category: "Shipping",
      commodity: "Crude oil",
      region: "Middle East",
      baseLikelihood: 0.7,
      signalStrength: 0.8,
      sourceAgreement: 0.75,
      exposure: 0.85,
      impactSeverity: 0.9,
      velocityIndicator: 0.8,
      dataConfidence: 0.85,
      firstDetected: "2026-08-15T00:00:00.000Z",
      lastUpdated: "2026-08-17T00:00:00.000Z",
      status: "active",
      supportingSignals: ["shipping-signal-1"],
      evidence: [{ id: "source-1", label: "Transit report" }],
      managementImplication: "Review route contingency.",
    });

    expect(risk.probability).toBeCloseTo(0.7525);
    expect(risk.impact).toBeCloseTo(0.8825);
    expect(risk.confidence).toBeCloseTo(0.7756, 3);
    expect(risk.supportingSignals).toEqual(["shipping-signal-1"]);
    expect(risk.scoringBasis).toHaveLength(3);
  });

  it("rejects invented out-of-range scoring inputs", () => {
    expect(() =>
      new DeterministicRiskEngine().score({
        riskId: "bad",
        title: "Bad risk",
        description: "Invalid",
        category: "Economic",
        commodity: "Copper",
        region: "Global",
        baseLikelihood: 2,
        signalStrength: 0.5,
        sourceAgreement: 0.5,
        exposure: 0.5,
        impactSeverity: 0.5,
        velocityIndicator: 0.5,
        dataConfidence: 0.5,
        firstDetected: "2026-08-15T00:00:00.000Z",
        lastUpdated: "2026-08-17T00:00:00.000Z",
        status: "watching",
        supportingSignals: ["signal"],
        evidence: [],
        managementImplication: "None",
      }),
    ).toThrow("baseLikelihood");
  });
});
