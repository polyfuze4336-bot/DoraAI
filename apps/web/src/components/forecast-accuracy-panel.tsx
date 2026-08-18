"use client";

import { Activity, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

import { DoraCard } from "@/components/design-system";

interface AccuracyRow {
  readonly forecastHorizonDays: number;
  readonly model: string;
  readonly modelVersion: string;
  readonly confidence: number;
  readonly accuracy: {
    readonly samples: number;
    readonly mae: number;
    readonly mape: number | null;
    readonly rmse: number;
    readonly directionalAccuracy: number;
  };
}

interface AccuracyResponse {
  readonly label: string;
  readonly observationCount: number;
  readonly forecasts: readonly AccuracyRow[];
}

export function ForecastAccuracyPanel({
  className,
}: {
  readonly className?: string;
}) {
  const [data, setData] = useState<AccuracyResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/forecasts/accuracy")
      .then((response) => {
        if (!response.ok) throw new Error("Forecast accuracy unavailable.");
        return response.json() as Promise<AccuracyResponse>;
      })
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  return (
    <DoraCard
      className={className}
      contentClassName="px-5 pb-5 sm:px-6 sm:pb-6"
      description={
        data?.label ?? "Walk-forward evaluation by forecast horizon."
      }
      emptyDescription="Backtest metrics appear after sufficient price history is available."
      emptyTitle="No measured accuracy yet"
      errorDescription="Forecasts remain labeled unmeasured until backtesting is restored."
      errorTitle="Accuracy service unavailable"
      eyebrow="Measured, not assumed"
      state={failed ? "error" : data ? "ready" : "loading"}
      title="Historical forecast accuracy"
    >
      {data ? (
        <>
          <div className="mb-4 flex items-center gap-2 text-xs text-[var(--ink-muted)]">
            <CheckCircle2 className="text-[var(--teal)]" size={15} />
            {data.observationCount} daily demo observations evaluated
          </div>
          <div className="grid gap-px overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-4">
            {data.forecasts.map((forecast) => (
              <div
                className="bg-[var(--surface)] p-4"
                key={forecast.forecastHorizonDays}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[var(--navy)]">
                    {forecast.forecastHorizonDays}-day
                  </span>
                  <Activity className="text-[var(--teal)]" size={14} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <Metric
                    label="MAE"
                    value={forecast.accuracy.mae.toFixed(2)}
                  />
                  <Metric
                    label="RMSE"
                    value={forecast.accuracy.rmse.toFixed(2)}
                  />
                  <Metric
                    label="MAPE"
                    value={
                      forecast.accuracy.mape === null
                        ? "N/A"
                        : `${forecast.accuracy.mape.toFixed(1)}%`
                    }
                  />
                  <Metric
                    label="Direction"
                    value={`${Math.round(forecast.accuracy.directionalAccuracy * 100)}%`}
                  />
                </div>
                <p className="mt-3 truncate text-[10px] text-[var(--ink-faint)]">
                  {forecast.model} v{forecast.modelVersion} ·{" "}
                  {forecast.accuracy.samples} tests
                </p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </DoraCard>
  );
}

function Metric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase text-[var(--ink-faint)]">
        {label}
      </div>
      <div className="mt-0.5 font-semibold tabular-nums text-[var(--ink)]">
        {value}
      </div>
    </div>
  );
}
