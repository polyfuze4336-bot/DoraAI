import type {
  AiEvaluationCandidate,
  AiEvaluationCase,
  AiQualityScores,
} from "./contracts";

export function evaluateAiAnswer(
  evaluationCase: AiEvaluationCase,
  candidate: AiEvaluationCandidate,
  evaluatedAt = new Date(),
): AiQualityScores {
  const failures: string[] = [];
  const allowedCitations = new Set(candidate.retrievedCitationIds);
  const invalidCitations = candidate.citationIds.filter(
    (id) => !allowedCitations.has(id),
  );
  const citationCorrectness = candidate.citationIds.length
    ? 1 - invalidCitations.length / candidate.citationIds.length
    : evaluationCase.minimumCitations === 0
      ? 1
      : 0;
  if (candidate.citationIds.length < evaluationCase.minimumCitations) {
    failures.push("Insufficient citations.");
  }
  if (invalidCitations.length)
    failures.push("Citation not present in retrieved evidence.");

  const evidence = new Set(candidate.evidenceKinds.map(normalize));
  const evidenceCoverage = coverage(
    evaluationCase.requiredEvidenceKinds.map(normalize),
    (expected) => evidence.has(expected),
  );
  const unsupportedCount =
    candidate.unsupportedClaims.length +
    evaluationCase.prohibitedClaims.filter((claim) =>
      normalize(candidate.answer).includes(normalize(claim)),
    ).length;
  const unsupportedClaims = unsupportedCount === 0 ? 1 : 0;
  if (!unsupportedClaims)
    failures.push("Unsupported or prohibited claim detected.");

  const normalizedAnswer = normalize(candidate.answer);
  const relevance = coverage(evaluationCase.requiredTerms, (term) =>
    normalizedAnswer.includes(normalize(term)),
  );
  if (relevance < 0.6) failures.push("Required decision context is missing.");

  const ages = candidate.sourceObservedAt
    .map((value) => (evaluatedAt.getTime() - Date.parse(value)) / 3_600_000)
    .filter(Number.isFinite);
  const freshSources = ages.filter(
    (age) => age >= 0 && age <= evaluationCase.maximumSourceAgeHours,
  ).length;
  const dataFreshness = ages.length ? freshSources / ages.length : 0;
  if (dataFreshness < 0.8)
    failures.push("Evidence does not meet the freshness bound.");

  const numericalAccuracy = coverage(
    evaluationCase.expectedNumericClaims,
    (expected) => {
      const actual = candidate.numericClaims.find(
        (claim) => normalize(claim.label) === normalize(expected.label),
      );
      return Boolean(
        actual && Math.abs(actual.value - expected.value) <= expected.tolerance,
      );
    },
  );
  if (numericalAccuracy < 1)
    failures.push("Required numerical claim is absent or outside tolerance.");

  const groundedness = clamp(
    0.45 * evidenceCoverage +
      0.35 * citationCorrectness +
      0.2 * unsupportedClaims,
  );
  if (groundedness < 0.8) failures.push("Groundedness is below threshold.");

  const overall = clamp(
    groundedness * 0.3 +
      citationCorrectness * 0.2 +
      relevance * 0.15 +
      dataFreshness * 0.15 +
      numericalAccuracy * 0.15 +
      unsupportedClaims * 0.05,
  );
  const passed =
    overall >= 0.8 &&
    groundedness >= 0.8 &&
    citationCorrectness === 1 &&
    numericalAccuracy === 1 &&
    unsupportedClaims === 1;

  return {
    groundedness,
    citationCorrectness,
    relevance,
    dataFreshness,
    numericalAccuracy,
    unsupportedClaims,
    overall,
    passed,
    failures: [...new Set(failures)],
  };
}

function coverage<T>(
  expected: readonly T[],
  predicate: (value: T) => boolean,
): number {
  if (!expected.length) return 1;
  return expected.filter(predicate).length / expected.length;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
