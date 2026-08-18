import { InterpretableBaselineForecastService } from "@dora/forecasting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const commodities = [
  { id: "BRENT", base: 84.16, trend: 0.045, amplitude: 1.6 },
  { id: "WTI", base: 80.82, trend: 0.038, amplitude: 1.45 },
  { id: "CU", base: 4.47, trend: 0.0018, amplitude: 0.13 },
  { id: "AL", base: 2614, trend: 0.72, amplitude: 38 },
] as const;

export async function GET() {
  const service = new InterpretableBaselineForecastService();
  const evaluations = await Promise.all(
    commodities.map(async (commodity) => {
      const observations = Array.from({ length: 245 }, (_, index) => ({
        observedAt: new Date(Date.UTC(2025, 11, index + 1)).toISOString(),
        value:
          commodity.base * 0.9 +
          commodity.trend * index +
          Math.sin(index / 7) * commodity.amplitude +
          Math.cos(index / 23) * commodity.amplitude * 0.45,
      }));
      const training = observations.slice(0, 150);
      const forecasts = await service.forecast({
        seriesId: commodity.id,
        observations: training,
        generatedAt: "2026-08-17T12:00:00.000Z",
      });
      return {
        commodity: commodity.id,
        forecasts: forecasts.map((forecast) => {
          const actual =
            observations[150 + forecast.forecastHorizonDays - 1]!.value;
          return {
            ...forecast,
            actual: Number(actual.toFixed(4)),
            absoluteError: Number(
              Math.abs(forecast.forecast - actual).toFixed(4),
            ),
            intervalHit:
              actual >= forecast.lowerBound && actual <= forecast.upperBound,
          };
        }),
        history: observations.slice(120, 150).map((point, index) => ({
          date: point.observedAt,
          actual: Number(point.value.toFixed(4)),
          forecast: Number(
            (observations[119 + index]?.value ?? point.value).toFixed(4),
          ),
        })),
      };
    }),
  );
  const all = evaluations.flatMap((item) => item.forecasts);
  return Response.json({
    source: "seeded-demo-backtest-history",
    label: "Prototype evaluation - not production evidence",
    evaluations,
    summary: {
      mae: mean(all.map((item) => item.accuracy.mae)),
      rmse: mean(all.map((item) => item.accuracy.rmse)),
      directionalAccuracy: mean(
        all.map((item) => item.accuracy.directionalAccuracy),
      ),
      intervalCoverage: mean(all.map((item) => (item.intervalHit ? 1 : 0))),
    },
    calibration: [
      { band: "50-59%", expected: 0.55, observed: coverage(all, 0.5, 0.6) },
      { band: "60-69%", expected: 0.65, observed: coverage(all, 0.6, 0.7) },
      { band: "70-79%", expected: 0.75, observed: coverage(all, 0.7, 0.8) },
      { band: "80-89%", expected: 0.85, observed: coverage(all, 0.8, 0.9) },
      {
        band: "90-95%",
        expected: 0.925,
        observed: coverage(all, 0.9, 0.96),
      },
    ],
  });
}

function mean(values: readonly number[]): number {
  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4),
  );
}

function coverage(
  values: readonly { confidence: number; intervalHit: boolean }[],
  minimum: number,
  maximum: number,
): number | null {
  const selected = values.filter(
    (item) => item.confidence >= minimum && item.confidence < maximum,
  );
  return selected.length
    ? mean(selected.map((item) => (item.intervalHit ? 1 : 0)))
    : null;
}
