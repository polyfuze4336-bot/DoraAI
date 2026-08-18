import type { NormalizedManufacturingStatus } from "@dora/shared";

export interface ManufacturingOutlookInfluence {
  readonly score: number;
  readonly direction: "supportive" | "neutral" | "softening";
  readonly confidence: number;
  readonly supportingRecordIds: readonly string[];
  readonly calculations: readonly string[];
}

export function calculateManufacturingOutlookInfluence(
  records: readonly NormalizedManufacturingStatus[],
): ManufacturingOutlookInfluence {
  if (!records.length) {
    return {
      score: 0,
      direction: "neutral",
      confidence: 0,
      supportingRecordIds: [],
      calculations: ["No manufacturing records were available."],
    };
  }
  const contributions = records.map((record) => {
    const outputPerformance = record.plannedOutput
      ? (record.actualOutput - record.plannedOutput) / record.plannedOutput
      : 0;
    const utilizationPressure = (record.utilization - 0.75) * 0.45;
    const demandPressure = (record.demandIndicator - 0.5) * 0.45;
    const feedstockPressure = (record.feedstockAvailability - 0.5) * 0.25;
    const outputPressure = clamp(outputPerformance, -1, 1) * 0.2;
    const downtimePenalty = Math.min(record.downtime / 168, 1) * 0.2;
    return clamp(
      utilizationPressure +
        demandPressure +
        feedstockPressure +
        outputPressure -
        downtimePenalty,
      -1,
      1,
    );
  });
  const score = average(contributions);
  const internalShare =
    records.filter((record) => record.dataOrigin === "internal").length /
    records.length;
  const freshness =
    records.filter(
      (record) => Date.now() - Date.parse(record.timestamp) <= 7 * 86_400_000,
    ).length / records.length;
  return {
    score: round(score),
    direction:
      score > 0.08 ? "supportive" : score < -0.08 ? "softening" : "neutral",
    confidence: round(0.35 + internalShare * 0.4 + freshness * 0.25),
    supportingRecordIds: records.map((record) => record.recordId),
    calculations: [
      "Utilization and demand indicators contribute 45% weights each before normalization.",
      "Feedstock availability and output performance add pressure; downtime reduces it.",
      "Seeded demo records reduce confidence relative to internal operational records.",
    ],
  };
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value: number): number {
  return Number(value.toFixed(4));
}
