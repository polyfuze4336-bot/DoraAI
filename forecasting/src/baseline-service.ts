import type { TimeSeriesPoint } from "./index";

export const forecastHorizons = [1, 7, 30, 90] as const;
export type ForecastHorizonDays = (typeof forecastHorizons)[number];

export interface BacktestMetrics {
  readonly samples: number;
  readonly mae: number;
  readonly mape: number | null;
  readonly rmse: number;
  readonly directionalAccuracy: number;
}

export interface ForecastAccuracy extends BacktestMetrics {
  readonly model: string;
  readonly modelVersion: string;
  readonly horizonDays: ForecastHorizonDays;
  readonly evaluatedAt: string;
}

export interface CommodityForecast {
  readonly seriesId: string;
  readonly forecast: number;
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly confidence: number;
  readonly model: string;
  readonly modelVersion: string;
  readonly forecastHorizonDays: ForecastHorizonDays;
  readonly generatedAt: string;
  readonly targetAt: string;
  readonly accuracy: ForecastAccuracy;
  readonly limitations: readonly string[];
}

export interface CommodityForecastRequest {
  readonly seriesId: string;
  readonly observations: readonly TimeSeriesPoint[];
  readonly horizons?: readonly ForecastHorizonDays[];
  readonly generatedAt?: string;
}

export interface CommodityForecastProvider {
  readonly id: string;
  forecast(
    request: CommodityForecastRequest,
  ): Promise<readonly CommodityForecast[]>;
}

interface BaselineModel {
  readonly id: string;
  readonly version: string;
  readonly minimumObservations: number;
  predict(history: readonly number[], horizonDays: number): number;
}

const models: readonly BaselineModel[] = [
  {
    id: "lag-one",
    version: "1.0.0",
    minimumObservations: 2,
    predict: (history) => history.at(-1) ?? 0,
  },
  {
    id: "moving-average-7",
    version: "1.0.0",
    minimumObservations: 3,
    predict: (history) => average(history.slice(-Math.min(7, history.length))),
  },
  {
    id: "exponential-smoothing",
    version: "1.0.0-alpha-0.35",
    minimumObservations: 3,
    predict: (history) => exponentialSmooth(history, 0.35),
  },
  {
    id: "linear-regression-trend",
    version: "1.0.0",
    minimumObservations: 4,
    predict: (history, horizonDays) => linearRegression(history, horizonDays),
  },
];

export class InterpretableBaselineForecastService implements CommodityForecastProvider {
  readonly id = "interpretable-baseline-ensemble-v1";

  async forecast(
    request: CommodityForecastRequest,
  ): Promise<readonly CommodityForecast[]> {
    const observations = normalizeObservations(request.observations);
    if (observations.length < 10) {
      throw new Error(
        "At least 10 daily observations are required for measured baseline forecasts.",
      );
    }
    const generatedAt = request.generatedAt ?? new Date().toISOString();
    const horizons = request.horizons ?? forecastHorizons;
    return horizons.map((horizonDays) =>
      this.forecastHorizon(
        request.seriesId,
        observations,
        horizonDays,
        generatedAt,
      ),
    );
  }

  private forecastHorizon(
    seriesId: string,
    observations: readonly TimeSeriesPoint[],
    horizonDays: ForecastHorizonDays,
    generatedAt: string,
  ): CommodityForecast {
    const values = observations.map((point) => point.value);
    const candidates = models
      .map((model) => ({
        model,
        evaluation: walkForward(model, values, horizonDays),
      }))
      .filter(({ evaluation }) => evaluation.metrics.samples > 0)
      .sort(
        (left, right) =>
          left.evaluation.metrics.mae - right.evaluation.metrics.mae,
      );
    const selected = candidates[0];
    if (!selected) {
      throw new Error(
        `Insufficient history to backtest a ${horizonDays}-day forecast.`,
      );
    }
    const prediction = selected.model.predict(values, horizonDays);
    const interval = 1.96 * selected.evaluation.metrics.rmse;
    const scale = Math.max(Math.abs(average(values)), Number.EPSILON);
    const sampleFactor = Math.min(selected.evaluation.metrics.samples / 20, 1);
    const confidence = clamp(
      sampleFactor * Math.exp(-selected.evaluation.metrics.rmse / scale),
      0.05,
      0.95,
    );
    const targetAt = new Date(observations.at(-1)!.observedAt);
    targetAt.setUTCDate(targetAt.getUTCDate() + horizonDays);
    return {
      seriesId,
      forecast: round(prediction),
      lowerBound: round(prediction - interval),
      upperBound: round(prediction + interval),
      confidence: round(confidence),
      model: selected.model.id,
      modelVersion: selected.model.version,
      forecastHorizonDays: horizonDays,
      generatedAt,
      targetAt: targetAt.toISOString(),
      accuracy: {
        ...selected.evaluation.metrics,
        model: selected.model.id,
        modelVersion: selected.model.version,
        horizonDays,
        evaluatedAt: generatedAt,
      },
      limitations: [
        "Model selection uses historical walk-forward error and does not guarantee future accuracy.",
        "Bounds use backtest RMSE as an empirical error interval, not a calibrated probability.",
        "Exogenous shocks and structural market changes are not represented by these baseline models.",
      ],
    };
  }
}

function walkForward(
  model: BaselineModel,
  values: readonly number[],
  horizonDays: number,
): {
  readonly metrics: BacktestMetrics;
  readonly errors: readonly number[];
} {
  const minimumTraining = Math.max(model.minimumObservations, 8);
  const errors: number[] = [];
  const percentageErrors: number[] = [];
  let directionMatches = 0;
  for (
    let trainingEnd = minimumTraining;
    trainingEnd + horizonDays <= values.length;
    trainingEnd += 1
  ) {
    const history = values.slice(0, trainingEnd);
    const actual = values[trainingEnd + horizonDays - 1];
    const previous = history.at(-1);
    if (actual === undefined || previous === undefined) continue;
    const predicted = model.predict(history, horizonDays);
    const error = predicted - actual;
    errors.push(error);
    if (actual !== 0) percentageErrors.push(Math.abs(error / actual));
    if (direction(predicted - previous) === direction(actual - previous)) {
      directionMatches += 1;
    }
  }
  const samples = errors.length;
  return {
    errors,
    metrics: {
      samples,
      mae: samples
        ? round(average(errors.map(Math.abs)))
        : Number.POSITIVE_INFINITY,
      mape: percentageErrors.length
        ? round(average(percentageErrors) * 100)
        : null,
      rmse: samples
        ? round(Math.sqrt(average(errors.map((error) => error ** 2))))
        : Number.POSITIVE_INFINITY,
      directionalAccuracy: samples ? round(directionMatches / samples) : 0,
    },
  };
}

function normalizeObservations(
  observations: readonly TimeSeriesPoint[],
): readonly TimeSeriesPoint[] {
  const unique = new Map<string, TimeSeriesPoint>();
  for (const point of observations) {
    if (
      !Number.isFinite(point.value) ||
      !Number.isFinite(Date.parse(point.observedAt))
    ) {
      throw new Error(
        "Forecast observations require finite values and ISO timestamps.",
      );
    }
    unique.set(point.observedAt, point);
  }
  return [...unique.values()].sort(
    (left, right) => Date.parse(left.observedAt) - Date.parse(right.observedAt),
  );
}

function exponentialSmooth(values: readonly number[], alpha: number): number {
  let level = values[0] ?? 0;
  for (const value of values.slice(1))
    level = alpha * value + (1 - alpha) * level;
  return level;
}

function linearRegression(
  values: readonly number[],
  horizonDays: number,
): number {
  const xMean = (values.length - 1) / 2;
  const yMean = average(values);
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < values.length; index += 1) {
    numerator += (index - xMean) * ((values[index] ?? 0) - yMean);
    denominator += (index - xMean) ** 2;
  }
  const slope = denominator ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  return intercept + slope * (values.length - 1 + horizonDays);
}

function direction(value: number): -1 | 0 | 1 {
  return Math.abs(value) < 1e-9 ? 0 : value > 0 ? 1 : -1;
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
