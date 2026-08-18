import { describe, expect, it } from "vitest";

import {
  forecastHorizons,
  InterpretableBaselineForecastService,
} from "@dora/forecasting";

describe("interpretable commodity forecasting service", () => {
  it("selects measured baselines for all required horizons", async () => {
    const service = new InterpretableBaselineForecastService();
    const observations = Array.from({ length: 150 }, (_, index) => ({
      observedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      value: 70 + index * 0.12 + Math.sin(index / 5),
    }));

    const forecasts = await service.forecast({
      seriesId: "brent",
      observations,
      generatedAt: "2026-08-17T12:00:00.000Z",
    });

    expect(forecasts.map((forecast) => forecast.forecastHorizonDays)).toEqual(
      forecastHorizons,
    );
    for (const forecast of forecasts) {
      expect(forecast.lowerBound).toBeLessThanOrEqual(forecast.forecast);
      expect(forecast.upperBound).toBeGreaterThanOrEqual(forecast.forecast);
      expect(forecast.confidence).toBeGreaterThan(0);
      expect(forecast.model).toBeTruthy();
      expect(forecast.modelVersion).toBeTruthy();
      expect(forecast.accuracy.mae).toBeGreaterThanOrEqual(0);
      expect(forecast.accuracy.rmse).toBeGreaterThanOrEqual(0);
      expect(forecast.accuracy.directionalAccuracy).toBeGreaterThanOrEqual(0);
      expect(forecast.accuracy.directionalAccuracy).toBeLessThanOrEqual(1);
      expect(forecast.accuracy.samples).toBeGreaterThan(0);
    }
  });

  it("does not report MAPE when actual values are mathematically invalid", async () => {
    const service = new InterpretableBaselineForecastService();
    const observations = Array.from({ length: 25 }, (_, index) => ({
      observedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      value: 0,
    }));

    const [forecast] = await service.forecast({
      seriesId: "zero-series",
      observations,
      horizons: [1],
    });

    expect(forecast?.accuracy.mape).toBeNull();
  });
});
