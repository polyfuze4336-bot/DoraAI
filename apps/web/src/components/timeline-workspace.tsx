"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  CalendarRange,
  Factory,
  Newspaper,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface TimelineEvent {
  id: string;
  timestamp: string;
  type:
    | "commodity"
    | "news"
    | "risk"
    | "manufacturing"
    | "forecast"
    | "recommendation";
  commodity: string;
  title: string;
  description: string;
  value: number | null;
  evidenceIds: string[];
  dataOrigin: "seeded-demo" | "production";
}

const types = [
  "commodity",
  "news",
  "risk",
  "manufacturing",
  "forecast",
  "recommendation",
] as const;

export function TimelineWorkspace() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [commodity, setCommodity] = useState("");
  const [enabledTypes, setEnabledTypes] = useState<string[]>([...types]);

  useEffect(() => {
    fetch("/api/timeline")
      .then((response) => response.json())
      .then((payload: { events: TimelineEvent[] }) =>
        setEvents(payload.events),
      );
  }, []);
  const visible = useMemo(
    () =>
      events.filter(
        (event) =>
          (!commodity || event.commodity === commodity) &&
          enabledTypes.includes(event.type),
      ),
    [commodity, enabledTypes, events],
  );
  const firstMarketMove = visible.find((event) => event.type === "commodity");
  const preceding = firstMarketMove
    ? visible.filter(
        (event) =>
          Date.parse(event.timestamp) < Date.parse(firstMarketMove.timestamp),
      )
    : [];

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
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--blue)]">
                <CalendarRange size={14} /> Historical intelligence
              </div>
              <h1 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">
                Synchronized timeline
              </h1>
            </div>
          </div>
          <span className="rounded-full bg-[var(--amber-soft)] px-3 py-1 text-[10px] font-bold uppercase text-[var(--amber)]">
            Seeded demo history
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">
        <section className="flex flex-wrap items-end gap-3 border-b border-[var(--line)] pb-5">
          <label className="text-[9px] font-bold uppercase text-[var(--ink-faint)]">
            Commodity
            <select
              value={commodity}
              onChange={(event) => setCommodity(event.target.value)}
              className="mt-1 block h-9 rounded-[8px] border border-[var(--line)] bg-white px-3 text-xs normal-case text-[var(--ink)]"
            >
              <option value="">All</option>
              {unique(events.map((item) => item.commodity)).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-1">
            {types.map((type) => {
              const active = enabledTypes.includes(type);
              return (
                <button
                  type="button"
                  key={type}
                  aria-pressed={active}
                  onClick={() =>
                    setEnabledTypes(
                      active
                        ? enabledTypes.filter((item) => item !== type)
                        : [...enabledTypes, type],
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-[9px] font-bold capitalize ${active ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--line)] text-[var(--ink-muted)]"}`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </section>
        <section className="mt-6 rounded-[8px] border border-[var(--teal-line)] bg-[var(--teal-soft)] p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--teal)]">
            <Sparkles size={15} /> Lead / lag evidence
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--ink)]">
            {firstMarketMove
              ? `${preceding.length} DORA evidence event${preceding.length === 1 ? "" : "s"} occurred before the first visible market movement on ${formatDate(firstMarketMove.timestamp)}.`
              : "Select commodity events to compare DORA signals with subsequent market moves."}
          </p>
        </section>
        <section className="mt-8">
          <div className="relative ml-4 border-l border-[var(--line-strong)] pl-7 sm:ml-24">
            {visible.map((event, index) => {
              const Icon = icon(event.type);
              return (
                <article className="relative pb-8" key={event.id}>
                  <span
                    className={`absolute -left-[43px] grid size-8 place-items-center rounded-full border-2 border-white shadow ${tone(event.type)}`}
                  >
                    <Icon size={14} />
                  </span>
                  <time className="text-[10px] font-bold text-[var(--teal)] sm:absolute sm:-left-32 sm:w-20 sm:text-right">
                    {formatDate(event.timestamp)}
                  </time>
                  <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-hairline)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-bold uppercase text-[var(--ink-faint)]">
                          {event.type} · {event.commodity}
                        </span>
                        <h2 className="mt-1 text-sm font-bold text-[var(--navy)]">
                          {event.title}
                        </h2>
                      </div>
                      {event.value !== null ? (
                        <span className="text-lg font-bold tabular-nums text-[var(--teal)]">
                          {event.value > 0 ? "+" : ""}
                          {event.value}
                          {event.type === "commodity" ||
                          event.type === "manufacturing"
                            ? "%"
                            : ""}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                      {event.description}
                    </p>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-[10px] font-bold text-[var(--blue)]">
                        Evidence ({event.evidenceIds.length})
                      </summary>
                      <p className="mt-2 text-[10px] text-[var(--ink-muted)]">
                        {event.evidenceIds.join(" · ")}
                      </p>
                    </details>
                    {index < visible.length - 1 ? (
                      <div className="absolute -bottom-1 left-0 text-[8px] font-bold uppercase text-[var(--ink-faint)]">
                        then
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
function icon(type: TimelineEvent["type"]) {
  return type === "news"
    ? Newspaper
    : type === "risk"
      ? ShieldAlert
      : type === "manufacturing"
        ? Factory
        : type === "forecast"
          ? BrainCircuit
          : type === "recommendation"
            ? Sparkles
            : TrendingUp;
}
function tone(type: TimelineEvent["type"]) {
  return type === "risk"
    ? "bg-[var(--danger-soft)] text-[var(--danger)]"
    : type === "forecast" || type === "recommendation"
      ? "bg-[var(--blue-soft)] text-[var(--blue)]"
      : "bg-[var(--teal-soft)] text-[var(--teal)]";
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
function unique(values: string[]) {
  return [...new Set(values)].sort();
}
