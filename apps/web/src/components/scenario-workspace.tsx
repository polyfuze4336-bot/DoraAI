"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  BrainCircuit,
  CalendarClock,
  ChevronRight,
  DollarSign,
  Factory,
  Gauge,
  RotateCcw,
  Ship,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Variables {
  brentPriceChangePercent: number;
  manufacturingDemandChangePercent: number;
  shippingDisruptionPercent: number;
  shippingDisruptionDurationDays: number;
  usdStrengthChangePercent: number;
}

interface ScenarioPayload {
  result: {
    scenarioId: string;
    calculated: {
      brentPrice: number;
      feedstockCostIndex: number;
      freightCostIndex: number;
      manufacturingDemandIndex: number;
      inventoryDays: number;
    };
    changes: {
      feedstockCostPercent: number;
      freightCostPercent: number;
      demandPercent: number;
      inventoryDays: number;
    };
    commodityImplications: string[];
    operationalImplications: string[];
    risks: string[];
    confidence: number;
    assumptions: string[];
    model: string;
  };
  explanation: {
    mode: "deterministic" | "foundry-ready";
    summary: string;
    confidence: number;
    uncertainties: string[];
  };
}

const defaults: Variables = {
  brentPriceChangePercent: 10,
  manufacturingDemandChangePercent: -5,
  shippingDisruptionPercent: 35,
  shippingDisruptionDurationDays: 30,
  usdStrengthChangePercent: 4,
};

export function ScenarioWorkspace() {
  const [variables, setVariables] = useState(defaults);
  const [payload, setPayload] = useState<ScenarioPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("story") ===
      "disruption-30d"
    ) {
      setVariables({
        brentPriceChangePercent: 10,
        manufacturingDemandChangePercent: -5,
        shippingDisruptionPercent: 70,
        shippingDisruptionDurationDays: 30,
        usdStrengthChangePercent: 4,
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch("/api/scenarios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(variables),
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then(setPayload)
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [variables]);

  return (
    <main className="min-h-screen bg-[var(--canvas)]">
      <header className="border-b border-[var(--line)] bg-[rgba(252,253,250,.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              className="dora-floating-control grid size-9 place-items-center"
              href="/dashboard"
              aria-label="Back to command centre"
            >
              <ArrowLeft size={17} />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--teal)]">
                <SlidersHorizontal size={14} /> Management laboratory
              </div>
              <h1 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">
                Scenario analysis
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVariables(defaults)}
            className="dora-floating-control flex h-9 items-center gap-2 px-3 text-xs font-bold"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] min-w-0 gap-7 px-5 py-7 lg:grid-cols-[400px_minmax(0,1fr)] lg:px-8">
        <aside className="self-start rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-6">
          <h2 className="font-serif text-2xl text-[var(--navy)]">
            Adjust the market
          </h2>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
            Move one or several variables. Calculations update together so
            interactions remain visible.
          </p>
          <div className="mt-7 space-y-7">
            <ScenarioSlider
              icon={TrendingUp}
              label="Brent price"
              value={variables.brentPriceChangePercent}
              min={-30}
              max={30}
              suffix="%"
              onChange={(value) =>
                setVariables({ ...variables, brentPriceChangePercent: value })
              }
            />
            <ScenarioSlider
              icon={Factory}
              label="Manufacturing demand"
              value={variables.manufacturingDemandChangePercent}
              min={-20}
              max={20}
              suffix="%"
              onChange={(value) =>
                setVariables({
                  ...variables,
                  manufacturingDemandChangePercent: value,
                })
              }
            />
            <ScenarioSlider
              icon={Ship}
              label="Shipping disruption"
              value={variables.shippingDisruptionPercent}
              min={0}
              max={100}
              suffix="%"
              onChange={(value) =>
                setVariables({ ...variables, shippingDisruptionPercent: value })
              }
            />
            <ScenarioSlider
              icon={CalendarClock}
              label="Disruption duration"
              value={variables.shippingDisruptionDurationDays}
              min={1}
              max={90}
              suffix=" days"
              onChange={(value) =>
                setVariables({
                  ...variables,
                  shippingDisruptionDurationDays: value,
                })
              }
            />
            <ScenarioSlider
              icon={DollarSign}
              label="USD strength"
              value={variables.usdStrengthChangePercent}
              min={-15}
              max={15}
              suffix="%"
              onChange={(value) =>
                setVariables({ ...variables, usdStrengthChangePercent: value })
              }
            />
          </div>
          <div className="mt-7 border-t border-[var(--line)] pt-4 text-[10px] leading-4 text-[var(--ink-faint)]">
            Prototype sensitivity model. Sliders do not represent probability
            distributions.
          </div>
        </aside>

        <section
          className={`min-w-0 transition-opacity ${loading ? "opacity-55" : "opacity-100"}`}
        >
          <div className="grid gap-px overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-5">
            <OutputMetric
              icon={TrendingUp}
              label="Brent"
              value={
                payload
                  ? `$${payload.result.calculated.brentPrice.toFixed(2)}`
                  : "-"
              }
              change={`${variables.brentPriceChangePercent >= 0 ? "+" : ""}${variables.brentPriceChangePercent}%`}
            />
            <OutputMetric
              icon={Gauge}
              label="Feedstock cost"
              value={
                payload?.result.calculated.feedstockCostIndex.toFixed(1) ?? "-"
              }
              change={signed(payload?.result.changes.feedstockCostPercent)}
            />
            <OutputMetric
              icon={Ship}
              label="Freight cost"
              value={
                payload?.result.calculated.freightCostIndex.toFixed(1) ?? "-"
              }
              change={signed(payload?.result.changes.freightCostPercent)}
            />
            <OutputMetric
              icon={Factory}
              label="Demand"
              value={
                payload?.result.calculated.manufacturingDemandIndex.toFixed(
                  1,
                ) ?? "-"
              }
              change={signed(payload?.result.changes.demandPercent)}
            />
            <OutputMetric
              icon={Boxes}
              label="Inventory cover"
              value={
                payload
                  ? `${payload.result.calculated.inventoryDays.toFixed(1)}d`
                  : "-"
              }
              change={signed(payload?.result.changes.inventoryDays, "d")}
            />
          </div>

          <article className="mt-6 border-y border-[var(--line)] py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--cyan)]">
                <BrainCircuit size={15} /> DORA explanation
              </div>
              <span className="rounded-full bg-[var(--teal-soft)] px-3 py-1 text-[10px] font-bold text-[var(--teal)]">
                {payload?.explanation.mode === "foundry-ready"
                  ? "Foundry ready"
                  : "Deterministic"}{" "}
                ·{" "}
                {payload ? Math.round(payload.explanation.confidence * 100) : 0}
                % confidence
              </span>
            </div>
            <h2 className="mt-4 max-w-4xl font-serif text-3xl leading-tight text-[var(--navy)]">
              {payload?.explanation.summary ?? "Calculating scenario..."}
            </h2>
          </article>

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            <ImplicationPanel
              title="Commodity implications"
              items={payload?.result.commodityImplications ?? []}
            />
            <ImplicationPanel
              title="Operational implications"
              items={payload?.result.operationalImplications ?? []}
            />
            <ImplicationPanel
              title="Risks"
              items={payload?.result.risks ?? []}
              empty="No material threshold risk in this scenario."
            />
          </div>

          <section className="mt-7 rounded-[8px] border border-[var(--amber-line)] bg-[var(--amber-soft)] p-5">
            <h3 className="text-xs font-bold uppercase text-[var(--amber)]">
              Assumptions & uncertainties
            </h3>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[var(--ink-muted)]">
              {payload?.result.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="mt-4 text-[9px] text-[var(--ink-faint)]">
              Model: {payload?.result.model ?? "deterministic-sensitivity-v1"}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function ScenarioSlider({
  icon: Icon,
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const position = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold text-[var(--ink)]">
          <Icon size={15} className="text-[var(--teal)]" /> {label}
        </span>
        <output className="rounded-[6px] bg-[var(--navy)] px-2.5 py-1 text-xs font-bold tabular-nums text-white">
          {value > 0 ? "+" : ""}
          {value}
          {suffix}
        </output>
      </div>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--surface-subtle)] accent-[var(--teal)]"
        style={{
          background: `linear-gradient(90deg, var(--teal) ${position}%, var(--surface-subtle) ${position}%)`,
        }}
      />
      <div className="mt-2 flex justify-between text-[9px] text-[var(--ink-faint)]">
        <span>
          {min}
          {suffix}
        </span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </label>
  );
}
function OutputMetric({
  icon: Icon,
  label,
  value,
  change,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div className="bg-[var(--surface)] p-4">
      <Icon size={15} className="text-[var(--teal)]" />
      <span className="mt-3 block text-[9px] font-bold uppercase text-[var(--ink-faint)]">
        {label}
      </span>
      <span className="mt-1 block text-xl font-bold tabular-nums text-[var(--navy)]">
        {value}
      </span>
      <span
        className={`mt-1 block text-[10px] font-bold ${change.startsWith("+") ? "text-[var(--danger)]" : "text-[var(--teal)]"}`}
      >
        {change} vs baseline
      </span>
    </div>
  );
}
function ImplicationPanel({
  title,
  items,
  empty = "No implication calculated.",
}: {
  title: string;
  items: string[];
  empty?: string;
}) {
  return (
    <section className="border-t-2 border-[var(--teal)] pt-4">
      <h3 className="text-sm font-bold text-[var(--navy)]">{title}</h3>
      <div className="mt-3 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              className="flex gap-2 text-xs leading-5 text-[var(--ink-muted)]"
              key={item}
            >
              <ChevronRight
                className="mt-1 shrink-0 text-[var(--teal)]"
                size={12}
              />
              {item}
            </div>
          ))
        ) : (
          <p className="text-xs text-[var(--ink-faint)]">{empty}</p>
        )}
      </div>
    </section>
  );
}
function signed(value: number | undefined, suffix = "%") {
  if (value === undefined) return "-";
  return `${value >= 0 ? "+" : ""}${value}${suffix}`;
}
