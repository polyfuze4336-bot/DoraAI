"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  Clock3,
  ExternalLink,
  Filter,
  Gauge,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface ScoredRisk {
  riskId: string;
  title: string;
  description: string;
  category: string;
  commodity: string;
  region: string;
  probability: number;
  impact: number;
  velocity: number;
  confidence: number;
  score: number;
  level: "low" | "medium" | "high" | "critical";
  firstDetected: string;
  lastUpdated: string;
  status: string;
  supportingSignals: string[];
  evidence: { id: string; label: string; sourceUrl?: string }[];
  managementImplication: string;
  scoringBasis: string[];
}

export function RiskWorkspace() {
  const [risks, setRisks] = useState<ScoredRisk[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [category, setCategory] = useState("");
  const [commodity, setCommodity] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/risks")
      .then((response) => response.json())
      .then((payload: { risks: ScoredRisk[] }) => {
        setRisks(payload.risks);
        setSelectedId(payload.risks[0]?.riskId ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      risks.filter(
        (risk) =>
          (!category || risk.category === category) &&
          (!commodity || risk.commodity === commodity) &&
          (!region || risk.region === region),
      ),
    [category, commodity, region, risks],
  );
  const selected =
    filtered.find((risk) => risk.riskId === selectedId) ?? filtered[0];

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
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--danger)]">
                <ShieldAlert size={14} /> Emerging risk
              </div>
              <h1 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">
                Risk intelligence
              </h1>
            </div>
          </div>
          <span className="rounded-full border border-[var(--amber-line)] bg-[var(--amber-soft)] px-3 py-1 text-[10px] font-bold uppercase text-[var(--amber)]">
            Seeded demo inputs
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--line)] pb-5">
          <div className="mr-2 flex items-center gap-2 pb-2 text-sm font-semibold">
            <Filter size={15} /> Filters
          </div>
          <Select
            label="Category"
            value={category}
            options={unique(risks.map((risk) => risk.category))}
            onChange={setCategory}
          />
          <Select
            label="Commodity"
            value={commodity}
            options={unique(risks.map((risk) => risk.commodity))}
            onChange={setCommodity}
          />
          <Select
            label="Region"
            value={region}
            options={unique(risks.map((risk) => risk.region))}
            onChange={setRegion}
          />
        </div>

        <section className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-7">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-[var(--navy)]">
                  Probability × impact heatmap
                </h2>
                <span className="text-xs text-[var(--ink-faint)]">
                  {filtered.length} risks
                </span>
              </div>
              <div className="relative h-72 w-full overflow-hidden rounded-[8px] border border-[var(--line)] bg-[linear-gradient(135deg,#e2f1e8_0%,#f8efcf_54%,#f3d8d9_100%)] sm:h-auto sm:aspect-[16/7] sm:min-h-72">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(13,38,56,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(13,38,56,.1)_1px,transparent_1px)] bg-[size:20%_20%]" />
                <span className="absolute bottom-2 left-3 rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--ink)]">
                  Low probability
                </span>
                <span className="absolute bottom-2 right-3 rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--ink)]">
                  High probability
                </span>
                <span className="absolute left-3 top-2 rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--ink)]">
                  High impact
                </span>
                {filtered.map((risk) => (
                  <button
                    key={risk.riskId}
                    onClick={() => setSelectedId(risk.riskId)}
                    className={`absolute grid size-9 -translate-x-1/2 translate-y-1/2 place-items-center rounded-full border-2 text-[10px] font-bold text-white shadow-lg ${risk.level === "critical" ? "border-white bg-[var(--danger)]" : risk.level === "high" ? "border-white bg-[var(--amber)]" : "border-white bg-[var(--teal)]"}`}
                    style={{
                      left: `${risk.probability * 100}%`,
                      bottom: `${risk.impact * 100}%`,
                    }}
                    title={risk.title}
                  >
                    {Math.round(risk.score * 100)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-bold text-[var(--navy)]">
                Risk register and trend
              </h2>
              <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {loading ? (
                  <p className="py-8 text-sm text-[var(--ink-muted)]">
                    Scoring risks...
                  </p>
                ) : (
                  filtered.map((risk) => (
                    <button
                      key={risk.riskId}
                      onClick={() => setSelectedId(risk.riskId)}
                      className="grid w-full gap-3 py-4 text-left sm:grid-cols-[minmax(0,1fr)_90px_100px] sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Level level={risk.level} />
                          <span className="text-sm font-bold">
                            {risk.title}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--ink-muted)]">
                          {risk.category} · {risk.commodity} · {risk.region}
                        </p>
                      </div>
                      <div className="text-xs">
                        <span className="block text-[9px] uppercase text-[var(--ink-faint)]">
                          Score
                        </span>
                        <span className="font-bold tabular-nums">
                          {Math.round(risk.score * 100)}
                        </span>
                      </div>
                      <div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                          <div
                            className="h-full bg-[var(--danger)]"
                            style={{ width: `${risk.score * 100}%` }}
                          />
                        </div>
                        <span className="mt-1 block text-[9px] text-[var(--ink-faint)]">
                          Updated {formatDate(risk.lastUpdated)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-bold text-[var(--navy)]">
                Detection timeline
              </h2>
              <div className="flex gap-4 overflow-x-auto border-y border-[var(--line)] py-5">
                {[...filtered]
                  .sort(
                    (a, b) =>
                      Date.parse(a.firstDetected) - Date.parse(b.firstDetected),
                  )
                  .map((risk) => (
                    <button
                      key={risk.riskId}
                      onClick={() => setSelectedId(risk.riskId)}
                      className="min-w-48 border-l-2 border-[var(--teal)] pl-3 text-left"
                    >
                      <span className="text-[10px] font-bold text-[var(--teal)]">
                        {formatDate(risk.firstDetected)}
                      </span>
                      <p className="mt-1 text-xs font-semibold">{risk.title}</p>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          <aside className="min-w-0 border-t border-[var(--line)] pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            {selected ? (
              <RiskDetail risk={selected} />
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">
                No risk matches these filters.
              </p>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

function RiskDetail({ risk }: { risk: ScoredRisk }) {
  return (
    <div className="sticky top-6 min-w-0 break-words">
      <div className="flex items-center justify-between">
        <Level level={risk.level} />
        <span className="text-[10px] font-bold uppercase text-[var(--ink-faint)]">
          {risk.status}
        </span>
      </div>
      <h2 className="mt-4 font-serif text-2xl text-[var(--navy)]">
        {risk.title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
        {risk.description}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Score icon={Gauge} label="Probability" value={risk.probability} />
        <Score icon={TrendingUp} label="Impact" value={risk.impact} />
        <Score icon={Clock3} label="Velocity" value={risk.velocity} />
        <Score icon={ShieldAlert} label="Confidence" value={risk.confidence} />
      </div>
      <div className="mt-6 border-t border-[var(--line)] pt-5">
        <p className="text-[10px] font-bold uppercase text-[var(--ink-faint)]">
          Management implication
        </p>
        <p className="mt-2 text-sm leading-6">{risk.managementImplication}</p>
      </div>
      <div className="mt-6">
        <p className="text-[10px] font-bold uppercase text-[var(--ink-faint)]">
          Evidence
        </p>
        <div className="mt-2 space-y-2">
          {risk.evidence.map((item) =>
            item.sourceUrl ? (
              <a
                key={item.id}
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between border-b border-[var(--line-soft)] py-2 text-xs font-semibold text-[var(--blue)]"
              >
                {item.label}
                <ExternalLink size={12} />
              </a>
            ) : (
              <span key={item.id}>{item.label}</span>
            ),
          )}
        </div>
      </div>
      <div className="mt-6 rounded-[8px] border border-[var(--blue-line)] bg-[var(--blue-soft)] p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--blue)]">
          <BrainCircuit size={15} /> AI explanation
        </div>
        <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
          Awaiting Foundry configuration. Scores shown above are deterministic
          and remain independent of AI interpretation.
        </p>
        <ul className="mt-3 space-y-1 text-[10px] text-[var(--ink-muted)]">
          {risk.scoringBasis.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-[10px] font-bold uppercase text-[var(--ink-faint)]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block h-9 min-w-40 rounded-[8px] border border-[var(--line)] bg-white px-3 text-xs normal-case text-[var(--ink)]"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Level({ level }: { level: ScoredRisk["level"] }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${level === "critical" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : level === "high" ? "bg-[var(--amber-soft)] text-[var(--amber)]" : "bg-[var(--teal-soft)] text-[var(--teal)]"}`}
    >
      {level}
    </span>
  );
}
function Score({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: number;
}) {
  return (
    <div className="border-b border-[var(--line-soft)] pb-3">
      <Icon size={14} className="text-[var(--teal)]" />
      <span className="mt-2 block text-[9px] uppercase text-[var(--ink-faint)]">
        {label}
      </span>
      <span className="text-lg font-bold tabular-nums">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}
function unique(values: string[]) {
  return [...new Set(values)].sort();
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
