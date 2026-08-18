"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  Factory,
  Gauge,
  PackageOpen,
  TrendingDown,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface ManufacturingRecord {
  recordId: string;
  site: string;
  region: string;
  product: string;
  capacity: number;
  utilization: number;
  plannedOutput: number;
  actualOutput: number;
  downtime: number;
  inventory: number;
  feedstockAvailability: number;
  demandIndicator: number;
  status: "normal" | "constrained" | "disrupted" | "maintenance";
  timestamp: string;
  dataOrigin: "internal" | "seeded-demo";
}

interface ManufacturingPayload {
  status: "ready" | "awaiting-database-configuration";
  records: ManufacturingRecord[];
  influence: {
    score: number;
    direction: "supportive" | "neutral" | "softening";
    confidence: number;
    calculations: string[];
  };
  message?: string;
}

export function ManufacturingWorkspace() {
  const [payload, setPayload] = useState<ManufacturingPayload | null>(null);
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const parameters = new URLSearchParams();
    if (region) parameters.set("region", region);
    if (status) parameters.set("status", status);
    fetch(`/api/manufacturing?${parameters}`)
      .then((response) => response.json())
      .then(setPayload);
  }, [region, status]);

  const records = useMemo(() => payload?.records ?? [], [payload?.records]);
  const totals = useMemo(() => summarize(records), [records]);

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
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--blue)]">
                <Factory size={14} /> Operations intelligence
              </div>
              <h1 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">
                Manufacturing
              </h1>
            </div>
          </div>
          <span className="rounded-full border border-[var(--blue-line)] bg-[var(--blue-soft)] px-3 py-1 text-[10px] font-bold uppercase text-[var(--blue)]">
            Database sourced
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">
        {payload?.status === "awaiting-database-configuration" ? (
          <div className="rounded-[8px] border border-[var(--amber-line)] bg-[var(--amber-soft)] p-5 text-sm leading-6 text-[var(--ink)]">
            <strong>Awaiting PostgreSQL configuration.</strong>{" "}
            {payload.message}
          </div>
        ) : null}

        <section className="mt-5 grid gap-px overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            icon={Gauge}
            label="Capacity utilization"
            value={`${Math.round(totals.utilization * 100)}%`}
            detail={`${records.length} sites`}
          />
          <Metric
            icon={TrendingUp}
            label="Actual output"
            value={format(totals.actualOutput)}
            detail={`${Math.round(totals.outputVariance * 100)}% vs plan`}
          />
          <Metric
            icon={Wrench}
            label="Downtime"
            value={`${totals.downtime.toFixed(0)} h`}
            detail="Latest reporting period"
          />
          <Metric
            icon={Boxes}
            label="Inventory"
            value={format(totals.inventory)}
            detail="Reported units"
          />
          <Metric
            icon={PackageOpen}
            label="Demand indicator"
            value={`${Math.round(totals.demand * 100)}%`}
            detail="Normalized index"
          />
        </section>

        <section className="mt-7 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[var(--navy)]">
                  Regional activity
                </h2>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  Capacity, output, outages, inventory, demand and feedstock
                  coverage.
                </p>
              </div>
              <div className="flex gap-2">
                <Filter
                  label="Region"
                  value={region}
                  onChange={setRegion}
                  options={unique(records.map((item) => item.region))}
                />
                <Filter
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    "normal",
                    "constrained",
                    "disrupted",
                    "maintenance",
                  ]}
                />
              </div>
            </div>
            <div className="overflow-x-auto border-y border-[var(--line)]">
              <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                <thead className="text-[9px] font-bold uppercase text-[var(--ink-faint)]">
                  <tr>
                    {[
                      "Site",
                      "Product",
                      "Utilization",
                      "Output vs plan",
                      "Downtime",
                      "Inventory",
                      "Demand",
                      "Feedstock",
                      "Status",
                    ].map((item) => (
                      <th className="px-3 py-3" key={item}>
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr
                      className="border-t border-[var(--line-soft)]"
                      key={record.recordId}
                    >
                      <td className="px-3 py-4">
                        <span className="block font-bold text-[var(--ink)]">
                          {record.site}
                        </span>
                        <span className="text-[10px] text-[var(--ink-faint)]">
                          {record.region}
                        </span>
                      </td>
                      <td className="px-3 py-4">{record.product}</td>
                      <td className="px-3 py-4 font-semibold tabular-nums">
                        {Math.round(record.utilization * 100)}%
                      </td>
                      <td
                        className={`px-3 py-4 font-semibold tabular-nums ${record.actualOutput >= record.plannedOutput ? "text-[var(--teal)]" : "text-[var(--danger)]"}`}
                      >
                        {percentChange(
                          record.actualOutput,
                          record.plannedOutput,
                        )}
                      </td>
                      <td className="px-3 py-4 tabular-nums">
                        {record.downtime} h
                      </td>
                      <td className="px-3 py-4 tabular-nums">
                        {format(record.inventory)}
                      </td>
                      <td className="px-3 py-4 tabular-nums">
                        {Math.round(record.demandIndicator * 100)}%
                      </td>
                      <td className="px-3 py-4 tabular-nums">
                        {Math.round(record.feedstockAvailability * 100)}%
                      </td>
                      <td className="px-3 py-4">
                        <Status value={record.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!records.length && payload?.status === "ready" ? (
              <p className="border-b border-[var(--line)] py-10 text-center text-sm text-[var(--ink-muted)]">
                No manufacturing records match these filters.
              </p>
            ) : null}
          </div>

          <aside className="min-w-0 border-t border-[var(--line)] pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="sticky top-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--teal)]">
                {payload?.influence.direction === "softening" ? (
                  <TrendingDown size={15} />
                ) : (
                  <TrendingUp size={15} />
                )}{" "}
                Outlook influence
              </div>
              <h2 className="mt-4 font-serif text-2xl text-[var(--navy)]">
                Manufacturing demand is{" "}
                {payload?.influence.direction ?? "neutral"}.
              </h2>
              <div className="mt-5 flex items-end justify-between border-y border-[var(--line)] py-4">
                <div>
                  <span className="block text-[9px] uppercase text-[var(--ink-faint)]">
                    Influence score
                  </span>
                  <span className="text-3xl font-bold tabular-nums">
                    {payload ? payload.influence.score.toFixed(2) : "-"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] uppercase text-[var(--ink-faint)]">
                    Confidence
                  </span>
                  <span className="text-lg font-bold tabular-nums">
                    {payload
                      ? `${Math.round(payload.influence.confidence * 100)}%`
                      : "-"}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-[var(--ink-muted)]">
                This deterministic indicator can influence DORA&apos;s market
                outlook as a calculated demand signal. It does not replace
                commodity price forecasts.
              </p>
              <ul className="mt-4 space-y-2 text-[10px] leading-4 text-[var(--ink-faint)]">
                {payload?.influence.calculations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {records.some((record) => record.dataOrigin === "seeded-demo") ? (
                <div className="mt-6 rounded-[8px] border border-[var(--amber-line)] bg-[var(--amber-soft)] p-4 text-xs leading-5">
                  <strong>Seeded/demo data.</strong> These rows live in the
                  application database and must not be presented as internal
                  production telemetry.
                </div>
              ) : null}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-[var(--surface)] p-5">
      <Icon size={16} className="text-[var(--teal)]" />
      <span className="mt-3 block text-[9px] font-bold uppercase text-[var(--ink-faint)]">
        {label}
      </span>
      <span className="mt-1 block text-xl font-bold tabular-nums text-[var(--navy)]">
        {value}
      </span>
      <span className="mt-1 block text-[10px] text-[var(--ink-muted)]">
        {detail}
      </span>
    </div>
  );
}
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="text-[9px] font-bold uppercase text-[var(--ink-faint)]">
      {label}
      <select
        className="mt-1 block h-8 rounded-[8px] border border-[var(--line)] bg-white px-2 text-xs normal-case text-[var(--ink)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All</option>
        {options.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}
function Status({ value }: { value: ManufacturingRecord["status"] }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${value === "normal" ? "bg-[var(--teal-soft)] text-[var(--teal)]" : value === "disrupted" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--amber-soft)] text-[var(--amber)]"}`}
    >
      {value}
    </span>
  );
}
function summarize(records: ManufacturingRecord[]) {
  const totalCapacity = records.reduce((sum, item) => sum + item.capacity, 0);
  const planned = records.reduce((sum, item) => sum + item.plannedOutput, 0);
  const actual = records.reduce((sum, item) => sum + item.actualOutput, 0);
  return {
    utilization: totalCapacity
      ? records.reduce(
          (sum, item) => sum + item.capacity * item.utilization,
          0,
        ) / totalCapacity
      : 0,
    actualOutput: actual,
    outputVariance: planned ? (actual - planned) / planned : 0,
    downtime: records.reduce((sum, item) => sum + item.downtime, 0),
    inventory: records.reduce((sum, item) => sum + item.inventory, 0),
    demand: records.length
      ? records.reduce((sum, item) => sum + item.demandIndicator, 0) /
        records.length
      : 0,
  };
}
function percentChange(actual: number, planned: number) {
  if (!planned) return "N/A";
  const value = ((actual - planned) / planned) * 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
function format(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(
    value,
  );
}
function unique(values: string[]) {
  return [...new Set(values)].sort();
}
