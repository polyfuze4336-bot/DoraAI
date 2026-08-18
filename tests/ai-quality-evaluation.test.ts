import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { evaluateAiAnswer, type AiEvaluationCase } from "@dora/agents";

const dataset = JSON.parse(
  readFileSync(
    new URL("../config/ai-evaluation-dataset.json", import.meta.url),
    "utf8",
  ),
) as AiEvaluationCase[];

describe("DORA AI quality evaluation", () => {
  it("contains at least 30 representative, testable questions", () => {
    expect(dataset.length).toBeGreaterThanOrEqual(30);
    expect(new Set(dataset.map((item) => item.id)).size).toBe(dataset.length);
    expect(dataset.some((item) => item.workload === "fast")).toBe(true);
    expect(dataset.some((item) => item.workload === "reasoning")).toBe(true);
    expect(
      dataset.filter((item) => item.expectedNumericClaims.length).length,
    ).toBeGreaterThanOrEqual(8);
    for (const item of dataset) {
      expect(item.question.trim()).not.toBe("");
      expect(item.requiredEvidenceKinds.length).toBeGreaterThan(0);
      expect(item.requiredTerms.length).toBeGreaterThan(0);
      expect(item.maximumSourceAgeHours).toBeGreaterThan(0);
    }
  });

  it("passes a fresh, relevant and numerically correct grounded answer", () => {
    const evaluationCase = dataset.find(
      (item) => item.id === "brent-current-price",
    );
    expect(evaluationCase).toBeDefined();

    const result = evaluateAiAnswer(
      evaluationCase!,
      {
        answer:
          "Brent was observed at 84.16 USD/bbl in the current DORA snapshot [market-1].",
        citationIds: ["market-1"],
        retrievedCitationIds: ["market-1"],
        evidenceKinds: ["observed-data", "citation"],
        sourceObservedAt: ["2026-08-17T12:00:00.000Z"],
        numericClaims: [{ label: "Brent price", value: 84.16 }],
        unsupportedClaims: [],
      },
      new Date("2026-08-17T13:00:00.000Z"),
    );

    expect(result.passed).toBe(true);
    expect(result.overall).toBe(1);
  });

  it("fails plausible prose with an invented citation or unsupported claim", () => {
    const evaluationCase = dataset.find(
      (item) => item.id === "brent-current-price",
    );

    const result = evaluateAiAnswer(
      evaluationCase!,
      {
        answer:
          "Brent is a live exchange price of 84.16 and is guaranteed to remain firm [invented-9].",
        citationIds: ["invented-9"],
        retrievedCitationIds: ["market-1"],
        evidenceKinds: ["observed-data"],
        sourceObservedAt: ["2026-08-10T12:00:00.000Z"],
        numericClaims: [{ label: "Brent price", value: 84.16 }],
        unsupportedClaims: ["Guaranteed future direction."],
      },
      new Date("2026-08-17T13:00:00.000Z"),
    );

    expect(result.passed).toBe(false);
    expect(result.citationCorrectness).toBe(0);
    expect(result.unsupportedClaims).toBe(0);
    expect(result.dataFreshness).toBe(0);
  });
});
