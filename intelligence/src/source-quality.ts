export interface SourceQualityInput {
  readonly sourceId: string;
  readonly configuredReliability: number;
  readonly freshness: number;
  readonly completeness: number;
  readonly corroboration: number;
  readonly historicalSignalQuality: number;
}

export interface SourceQualityAssessment {
  readonly sourceId: string;
  readonly qualityScore: number;
  readonly grade: "A" | "B" | "C" | "D";
  readonly components: Omit<SourceQualityInput, "sourceId">;
  readonly method: "weighted-source-quality-v1";
  readonly assessedAt: string;
  readonly caveat: string;
}

export function assessSourceQuality(
  input: SourceQualityInput,
  assessedAt = new Date().toISOString(),
): SourceQualityAssessment {
  for (const [name, value] of Object.entries(input).filter(
    ([name]) => name !== "sourceId",
  )) {
    if (typeof value !== "number" || value < 0 || value > 1) {
      throw new Error(`${name} must be between 0 and 1.`);
    }
  }
  const qualityScore =
    input.configuredReliability * 0.3 +
    input.freshness * 0.25 +
    input.completeness * 0.15 +
    input.corroboration * 0.15 +
    input.historicalSignalQuality * 0.15;
  return {
    sourceId: input.sourceId,
    qualityScore: round(qualityScore),
    grade:
      qualityScore >= 0.85
        ? "A"
        : qualityScore >= 0.7
          ? "B"
          : qualityScore >= 0.5
            ? "C"
            : "D",
    components: {
      configuredReliability: input.configuredReliability,
      freshness: input.freshness,
      completeness: input.completeness,
      corroboration: input.corroboration,
      historicalSignalQuality: input.historicalSignalQuality,
    },
    method: "weighted-source-quality-v1",
    assessedAt,
    caveat:
      "Source quality measures reliability and data fitness; it does not measure agreement with DORA's outlook.",
  };
}

export function qualityWeightedConfidence(
  evidenceConfidence: number,
  qualities: readonly SourceQualityAssessment[],
): number {
  if (!qualities.length) return round(evidenceConfidence * 0.5);
  const meanQuality =
    qualities.reduce((sum, item) => sum + item.qualityScore, 0) /
    qualities.length;
  return round(Math.min(Math.max(evidenceConfidence * meanQuality, 0), 1));
}

function round(value: number): number {
  return Number(value.toFixed(4));
}