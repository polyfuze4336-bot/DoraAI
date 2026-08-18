"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Gauge,
  Target,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ForecastEvaluation {
  commodity: string;
  forecasts: {
    forecastHorizonDays: number;
    forecast: number;
    actual: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
    model: string;
    modelVersion: string;
    intervalHit: boolean;
    accuracy: {
      mae: number;
      rmse: number;
      mape: number | null;
      directionalAccuracy: number;
      samples: number;
    };
  }[];
  history: { date: string; actual: number; forecast: number }[];
}
interface PerformancePayload {
  label: string;
  evaluations: ForecastEvaluation[];
  summary: {
    mae: number;
    rmse: number;
    directionalAccuracy: number;
    intervalCoverage: number;
  };
  calibration: { band: string; expected: number; observed: number | null }[];
}

const chartTooltipStyle = {
  border: "1px solid #dce2df",
  borderRadius: 8,
  background: "rgba(252,253,250,.97)",
  boxShadow: "0 10px 28px rgba(13,38,56,.12)",
  color: "#17262e",
  fontFamily: "Manrope Variable, sans-serif",
  fontSize: 11,
};

export function PerformanceWorkspace() {
  const [data, setData] = useState<PerformancePayload | null>(null);
  const [commodity, setCommodity] = useState("BRENT");
  useEffect(() => {
    fetch("/api/performance")
      .then((response) => response.json())
      .then(setData);
  }, []);
  const selected =
    data?.evaluations.find((item) => item.commodity === commodity) ??
    data?.evaluations[0];
  const horizonData =
    selected?.forecasts.map((item) => ({
      horizon: `${item.forecastHorizonDays}d`,
      MAE: item.accuracy.mae,
      RMSE: item.accuracy.rmse,
      direction: item.accuracy.directionalAccuracy * 100,
    })) ?? [];
  return (
    <main className="min-h-screen bg-[var(--canvas)]">
      <header className="border-b border-[var(--line)] bg-[rgba(252,253,250,.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              aria-label="Back to command centre"
              className="dora-floating-control grid size-9 place-items-center"
            >
              <ArrowLeft size={17} />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--teal)]">
                <Target size={14} /> Objective evaluation
              </div>
              <h1 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">
                Forecast performance
              </h1>
            </div>
          </div>
          <span className="rounded-full bg-[var(--amber-soft)] px-3 py-1 text-[10px] font-bold text-[var(--amber)]">
            Prototype history
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">
        <div className="rounded-[8px] border border-[var(--amber-line)] bg-[var(--amber-soft)] p-4 text-xs leading-5">
          <strong>{data?.label ?? "Loading evaluation..."}</strong> Production
          usefulness must be established on live out-of-sample forecasts.
        </div>
        <section className="mt-5 grid gap-px overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={Target}
            label="MAE"
            value={data?.summary.mae.toFixed(2) ?? "-"}
          />
          <Metric
            icon={Gauge}
            label="RMSE"
            value={data?.summary.rmse.toFixed(2) ?? "-"}
          />
          <Metric
            icon={TrendingUp}
            label="Directional accuracy"
            value={
              data
                ? `${Math.round(data.summary.directionalAccuracy * 100)}%`
                : "-"
            }
          />
          <Metric
            icon={CheckCircle2}
            label="Interval coverage"
            value={
              data ? `${Math.round(data.summary.intervalCoverage * 100)}%` : "-"
            }
          />
        </section>
        <section className="mt-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--navy)]">
                Forecast versus actual market price
              </h2>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Historical one-step prototype comparison.
              </p>
            </div>
            <select
              value={commodity}
              onChange={(event) => setCommodity(event.target.value)}
              className="h-9 rounded-[8px] border border-[var(--line)] bg-white px-3 text-xs font-bold"
            >
              {data?.evaluations.map((item) => (
                <option key={item.commodity}>{item.commodity}</option>
              ))}
            </select>
          </div>
          <div className="h-80 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selected?.history ?? []}>
                <CartesianGrid stroke="#e9edeb" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  tick={{ fontSize: 9 }}
                />
                <YAxis width={55} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#0d2638"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#0b756d"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="mt-7 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-bold text-[var(--navy)]">
              Accuracy by horizon · {selected?.commodity}
            </h2>
            <div className="h-72 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={horizonData}>
                  <CartesianGrid stroke="#e9edeb" vertical={false} />
                  <XAxis dataKey="horizon" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="MAE" fill="#0b756d" />
                  <Bar dataKey="RMSE" fill="#285f89" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold text-[var(--navy)]">
              Confidence calibration
            </h2>
            <div className="space-y-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
              {data?.calibration.map((item) => (
                <div key={item.band}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold">{item.band}</span>
                    <span>
                      {item.observed === null
                        ? "No samples"
                        : `${Math.round(item.observed * 100)}% observed`}{" "}
                      · {Math.round(item.expected * 100)}% expected
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                    <div
                      className="h-full bg-[var(--teal)]"
                      style={{ width: `${(item.observed ?? 0) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="mt-7">
          <h2 className="mb-3 text-sm font-bold text-[var(--navy)]">
            Model and horizon detail
          </h2>
          <div className="overflow-x-auto border-y border-[var(--line)]">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="text-[9px] font-bold uppercase text-[var(--ink-faint)]">
                <tr>
                  {[
                    "Commodity",
                    "Horizon",
                    "DORA forecast",
                    "Actual",
                    "MAE",
                    "RMSE",
                    "Direction",
                    "Confidence",
                    "Model version",
                  ].map((item) => (
                    <th key={item} className="px-3 py-3">
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.evaluations.flatMap((evaluation) =>
                  evaluation.forecasts.map((forecast) => (
                    <tr
                      className="border-t border-[var(--line-soft)]"
                      key={`${evaluation.commodity}-${forecast.forecastHorizonDays}`}
                    >
                      <td className="px-3 py-3 font-bold">
                        {evaluation.commodity}
                      </td>
                      <td className="px-3 py-3">
                        {forecast.forecastHorizonDays}d
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {forecast.forecast.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {forecast.actual.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {forecast.accuracy.mae.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {forecast.accuracy.rmse.toFixed(2)}
                      </td>
                      <td className="px-3 py-3">
                        {Math.round(
                          forecast.accuracy.directionalAccuracy * 100,
                        )}
                        %
                      </td>
                      <td className="px-3 py-3">
                        {Math.round(forecast.confidence * 100)}%
                      </td>
                      <td className="px-3 py-3">
                        {forecast.model} v{forecast.modelVersion}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[var(--surface)] p-5">
      <Icon className="text-[var(--teal)]" size={16} />
      <span className="mt-3 block text-[9px] font-bold uppercase text-[var(--ink-faint)]">
        {label}
      </span>
      <span className="mt-1 block text-2xl font-bold tabular-nums text-[var(--navy)]">
        {value}
      </span>
    </div>
  );
}
