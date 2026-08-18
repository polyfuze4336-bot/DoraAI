export interface TimeSeriesPoint {
  readonly observedAt: string;
  readonly value: number;
}

export * from "./baseline-service";

export interface ForecastRequest {
  readonly seriesId: string;
  readonly observations: readonly TimeSeriesPoint[];
  readonly horizon: number;
  readonly intervalDays: number;
}

export interface ForecastPoint extends TimeSeriesPoint {
  readonly lower: number;
  readonly upper: number;
}

export interface ForecastResult {
  readonly engine: string;
  readonly seriesId: string;
  readonly generatedAt: string;
  readonly points: readonly ForecastPoint[];
  readonly limitations: readonly string[];
}

export interface ForecastEngine {
  readonly id: string;
  forecast(request: ForecastRequest): Promise<ForecastResult>;
}

export class DriftBaselineForecastEngine implements ForecastEngine {
  readonly id = "drift-baseline-v1";

  async forecast(request: ForecastRequest): Promise<ForecastResult> {
    if (request.observations.length < 2) {
      throw new Error(
        "At least two observations are required for a drift forecast.",
      );
    }

    if (request.horizon < 1 || request.intervalDays < 1) {
      throw new Error(
        "Forecast horizon and interval must be positive integers.",
      );
    }

    const sorted = [...request.observations].sort(
      (left, right) =>
        Date.parse(left.observedAt) - Date.parse(right.observedAt),
    );
    const first = sorted[0];
    const last = sorted.at(-1);

    if (!first || !last) {
      throw new Error("Forecast observations are unavailable.");
    }

    const drift = (last.value - first.value) / (sorted.length - 1);
    const residuals = sorted.slice(1).map((point, index) => {
      const previous = sorted[index];
      return previous ? point.value - previous.value - drift : 0;
    });
    const variance = residuals.length
      ? residuals.reduce((total, residual) => total + residual ** 2, 0) /
        residuals.length
      : 0;
    const standardDeviation = Math.sqrt(variance);
    const lastDate = new Date(last.observedAt);

    const points = Array.from({ length: request.horizon }, (_, index) => {
      const step = index + 1;
      const observedAt = new Date(lastDate);
      observedAt.setUTCDate(
        observedAt.getUTCDate() + step * request.intervalDays,
      );
      const value = last.value + drift * step;
      const interval = 1.96 * standardDeviation * Math.sqrt(step);

      return {
        observedAt: observedAt.toISOString(),
        value: round(value),
        lower: round(value - interval),
        upper: round(value + interval),
      };
    });

    return {
      engine: this.id,
      seriesId: request.seriesId,
      generatedAt: new Date().toISOString(),
      points,
      limitations: [
        "Baseline extrapolation assumes recent drift persists.",
        "Intervals describe historical residual variation, not calibrated market probabilities.",
      ],
    };
  }
}

function round(value: number): number {
  return Number(value.toFixed(4));
}
