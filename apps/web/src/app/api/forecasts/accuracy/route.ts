import { InterpretableBaselineForecastService } from "@dora/forecasting";
import {
  correlationIdFromHeaders,
  withObservedOperation,
} from "@dora/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withObservedOperation(
    "forecast.pipeline",
    {
      correlationId: correlationIdFromHeaders(request.headers),
      category: "forecast",
      attributes: { seriesId: "brent-demo", horizonCount: 4 },
    },
    () => calculateAccuracy(),
  );
}

async function calculateAccuracy() {
  const service = new InterpretableBaselineForecastService();
  const observations = Array.from({ length: 150 }, (_, index) => ({
    observedAt: new Date(Date.UTC(2026, 2, index + 1)).toISOString(),
    value:
      72 +
      index * 0.055 +
      Math.sin(index / 8) * 1.35 +
      Math.cos(index / 19) * 0.6,
  }));
  const generatedAt = new Date().toISOString();
  const forecasts = await service.forecast({
    seriesId: "brent-demo",
    observations,
    generatedAt,
  });
  return Response.json({
    source: "seeded-demo-history",
    label: "Prototype backtest - not production accuracy",
    observationCount: observations.length,
    forecasts,
    generatedAt,
  });
}
