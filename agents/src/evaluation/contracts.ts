export type EvaluationWorkload = "fast" | "reasoning";

export interface ExpectedNumericClaim {
  readonly label: string;
  readonly value: number;
  readonly tolerance: number;
}

export interface AiEvaluationCase {
  readonly id: string;
  readonly question: string;
  readonly workload: EvaluationWorkload;
  readonly commodityIds: readonly string[];
  readonly requiredEvidenceKinds: readonly string[];
  readonly requiredTerms: readonly string[];
  readonly minimumCitations: number;
  readonly maximumSourceAgeHours: number;
  readonly expectedNumericClaims: readonly ExpectedNumericClaim[];
  readonly prohibitedClaims: readonly string[];
}

export interface AiEvaluationCandidate {
  readonly answer: string;
  readonly citationIds: readonly string[];
  readonly retrievedCitationIds: readonly string[];
  readonly evidenceKinds: readonly string[];
  readonly sourceObservedAt: readonly string[];
  readonly numericClaims: readonly { label: string; value: number }[];
  readonly unsupportedClaims: readonly string[];
  readonly latencyMs?: number;
  readonly estimatedCostUsd?: number;
  readonly toolCalls?: number;
}

export interface AiQualityScores {
  readonly groundedness: number;
  readonly citationCorrectness: number;
  readonly relevance: number;
  readonly dataFreshness: number;
  readonly numericalAccuracy: number;
  readonly unsupportedClaims: number;
  readonly overall: number;
  readonly passed: boolean;
  readonly failures: readonly string[];
}
