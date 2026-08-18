import type { DoraSignal } from "@dora/shared";

import type {
  CorrelationCalculation,
  SignalAnomaly,
  SignalFreshnessScore,
  TrendCalculation,
} from "./contracts";

export function scoreFreshness(
  signals: readonly DoraSignal[],
  asOf: string,
): readonly SignalFreshnessScore[] {
  const assessedAt = Date.parse(asOf);
  return signals.map((signal) => {
    const observedAt = Date.parse(signal.timestamp);
    const ageMinutes =
      Number.isFinite(assessedAt) && Number.isFinite(observedAt)
        ? Math.max(0, (assessedAt - observedAt) / 60_000)
        : null;
    const expected = signal.freshness.expectedRefreshMinutes;
    const score =
      ageMinutes === null ? 0 : Math.exp(-ageMinutes / Math.max(expected, 1));
    return {
      signalId: signal.signalId,
      ageMinutes,
      score: round(score),
      status:
        ageMinutes === null
          ? "unknown"
          : ageMinutes <= expected
            ? "fresh"
            : ageMinutes <= expected * 3
              ? "delayed"
              : "stale",
    };
  });
}

export function detectAnomalies(
  signals: readonly DoraSignal[],
): readonly SignalAnomaly[] {
  return groupNumericSeries(signals).flatMap(([seriesId, series]) => {
    if (series.length < 3) return [];
    const values = series.map(({ value }) => value);
    const mean = average(values);
    const deviation = standardDeviation(values, mean);
    return series.map(({ signal, value }) => {
      const zScore = deviation ? (value - mean) / deviation : 0;
      return {
        signalId: signal.signalId,
        commodityId: signal.commodity?.id ?? null,
        zScore: round(zScore),
        anomalous: Math.abs(zScore) >= 2,
      };
    });
  });
}

export function calculateTrends(
  signals: readonly DoraSignal[],
): readonly TrendCalculation[] {
  return groupNumericSeries(signals).flatMap(([seriesId, series]) => {
    if (series.length < 2) return [];
    const ordered = [...series].sort(
      (left, right) =>
        Date.parse(left.signal.timestamp) - Date.parse(right.signal.timestamp),
    );
    const values = ordered.map(({ value }) => value);
    const x = values.map((_, index) => index);
    const xMean = average(x);
    const yMean = average(values);
    const numerator = values.reduce(
      (sum, value, index) => sum + ((x[index] ?? 0) - xMean) * (value - yMean),
      0,
    );
    const denominator = x.reduce((sum, value) => sum + (value - xMean) ** 2, 0);
    const slope = denominator ? numerator / denominator : 0;
    const scale = Math.max(Math.abs(yMean), 1);
    const normalizedSlope = slope / scale;
    return [
      {
        seriesId,
        direction:
          Math.abs(normalizedSlope) < 0.001
            ? "FLAT"
            : normalizedSlope > 0
              ? "UP"
              : "DOWN",
        slope: round(slope),
        strength: round(Math.min(Math.abs(normalizedSlope) * 100, 1)),
        observations: values.length,
      },
    ];
  });
}

export function calculateCorrelations(
  signals: readonly DoraSignal[],
): readonly CorrelationCalculation[] {
  const series = groupNumericSeries(signals);
  const results: CorrelationCalculation[] = [];
  for (let leftIndex = 0; leftIndex < series.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < series.length;
      rightIndex += 1
    ) {
      const left = series[leftIndex];
      const right = series[rightIndex];
      if (!left || !right) continue;
      const leftByTime = new Map(
        left[1].map(({ signal, value }) => [signal.timestamp, value]),
      );
      const pairs = right[1].flatMap(({ signal, value }) => {
        const leftValue = leftByTime.get(signal.timestamp);
        return leftValue === undefined ? [] : [[leftValue, value] as const];
      });
      if (pairs.length < 3) continue;
      const coefficient = pearson(
        pairs.map(([value]) => value),
        pairs.map(([, value]) => value),
      );
      results.push({
        leftSeriesId: left[0],
        rightSeriesId: right[0],
        coefficient: round(coefficient),
        observations: pairs.length,
      });
    }
  }
  return results;
}

export function groupNumericSeries(
  signals: readonly DoraSignal[],
): readonly [
  string,
  readonly { readonly signal: DoraSignal; readonly value: number }[],
][] {
  const grouped = new Map<
    string,
    { readonly signal: DoraSignal; readonly value: number }[]
  >();
  for (const signal of signals) {
    if (typeof signal.value !== "number" || !Number.isFinite(signal.value))
      continue;
    const seriesId = `${signal.commodity?.id ?? "unassigned"}:${signal.signalType}:${signal.unit ?? "value"}`;
    grouped.set(seriesId, [
      ...(grouped.get(seriesId) ?? []),
      { signal, value: signal.value },
    ]);
  }
  return [...grouped.entries()];
}

function pearson(left: readonly number[], right: readonly number[]): number {
  const leftMean = average(left);
  const rightMean = average(right);
  let numerator = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = (left[index] ?? 0) - leftMean;
    const rightDelta = (right[index] ?? 0) - rightMean;
    numerator += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  }
  return leftVariance && rightVariance
    ? numerator / Math.sqrt(leftVariance * rightVariance)
    : 0;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: readonly number[], mean: number): number {
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length,
  );
}

function round(value: number): number {
  return Number(value.toFixed(4));
}
