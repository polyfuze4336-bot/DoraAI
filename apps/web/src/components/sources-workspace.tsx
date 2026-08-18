"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  Edit3,
  KeyRound,
  LoaderCircle,
  Play,
  Power,
  RefreshCw,
  Save,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface SourceRecord {
  id: string;
  name: string;
  type: string;
  authentication: string;
  commercial: boolean;
  enabled: boolean;
  refreshMinutes: number | null;
  status: string;
  lastRefresh: string | null;
  nextRefresh: string | null;
  records: number;
  latencyMs: number | null;
  errors: number;
  freshness: string;
  quality: {
    qualityScore: number;
    grade: string;
    components: {
      configuredReliability: number;
      freshness: number;
      completeness: number;
      corroboration: number;
      historicalSignalQuality: number;
    };
    caveat: string;
  };
}

interface ScheduleRecord {
  id: string;
  label: string;
  enabled: boolean;
  logicalSchedule: string;
  providerTypes: string[];
}

export function SourcesWorkspace() {
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [timezone, setTimezone] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [sourcesResponse, schedulesResponse] = await Promise.all([
      fetch("/api/sources"),
      fetch("/api/admin/schedules"),
    ]);
    const sourcePayload = (await sourcesResponse.json()) as {
      sources: SourceRecord[];
    };
    const schedulePayload = (await schedulesResponse.json()) as {
      jobs: ScheduleRecord[];
      timezone: string;
    };
    setSources(sourcePayload.sources);
    setSchedules(schedulePayload.jobs);
    setTimezone(schedulePayload.timezone);
  }

  async function action(
    sourceId: string,
    value: "test" | "sync" | "enable" | "disable" | "edit",
    configuration?: { refreshMinutes?: number; configuredReliability?: number },
  ) {
    setBusy(`${sourceId}:${value}`);
    setMessage("");
    const response = await fetch("/api/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: value, sourceId, configuration }),
    });
    const payload = (await response.json()) as {
      status?: string;
      error?: string;
      health?: { status: string; message?: string };
    };
    setMessage(
      payload.error ??
        payload.health?.message ??
        payload.health?.status ??
        payload.status ??
        "Source updated.",
    );
    await load();
    setBusy("");
    if (value === "edit") setEditing(null);
  }

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
                <Database size={14} /> Data operations
              </div>
              <h1 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">
                Source management
              </h1>
            </div>
          </div>
          <span className="hidden text-xs text-[var(--ink-muted)] sm:block">
            Secrets are never displayed
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">
        {message ? (
          <div className="mb-5 rounded-[8px] border border-[var(--teal-line)] bg-[var(--teal-soft)] p-3 text-xs">
            {message}
          </div>
        ) : null}
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--navy)]">
                Connectors
              </h2>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Prototype, enterprise and future commercial sources share one
                adapter boundary.
              </p>
            </div>
            <span className="text-xs text-[var(--ink-faint)]">
              {sources.length} sources
            </span>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {sources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                editing={editing === source.id}
                busy={busy.startsWith(`${source.id}:`)}
                onEdit={() =>
                  setEditing(editing === source.id ? null : source.id)
                }
                onAction={action}
              />
            ))}
          </div>
        </section>

        <section className="mt-9 border-t border-[var(--line)] pt-7">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-[var(--navy)]">
              Logical schedule
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Configuration-owned schedule in {timezone}. The ACA dispatcher
              checks due work every 30 minutes.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-3">
            {schedules.map((schedule) => (
              <div className="bg-[var(--surface)] p-4" key={schedule.id}>
                <div className="flex items-center justify-between">
                  <Clock3 size={15} className="text-[var(--teal)]" />
                  <span
                    className={`size-2 rounded-full ${schedule.enabled ? "bg-[var(--teal)]" : "bg-[var(--ink-faint)]"}`}
                  />
                </div>
                <h3 className="mt-3 text-xs font-bold">{schedule.label}</h3>
                <p className="mt-1 text-[10px] text-[var(--ink-muted)]">
                  {schedule.logicalSchedule}
                </p>
                <p className="mt-2 truncate text-[9px] text-[var(--ink-faint)]">
                  {schedule.providerTypes.join(", ") || "DORA synthesis"}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SourceCard({
  source,
  editing,
  busy,
  onEdit,
  onAction,
}: {
  source: SourceRecord;
  editing: boolean;
  busy: boolean;
  onEdit: () => void;
  onAction: (
    id: string,
    action: "test" | "sync" | "enable" | "disable" | "edit",
    configuration?: { refreshMinutes?: number; configuredReliability?: number },
  ) => void;
}) {
  const [refreshMinutes, setRefreshMinutes] = useState(
    source.refreshMinutes ?? 60,
  );
  const [reliability, setReliability] = useState(
    source.quality.components.configuredReliability,
  );
  return (
    <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-hairline)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--navy)]">
              {source.name}
            </h3>
            <Status value={source.status} />
          </div>
          <p className="mt-1 text-[10px] text-[var(--ink-muted)]">
            {source.type}
          </p>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-[var(--surface-subtle)] text-[var(--teal)]">
          <Database size={17} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Detail
          label="Authentication"
          value={source.authentication}
          icon={KeyRound}
        />
        <Detail
          label="Last refresh"
          value={formatTime(source.lastRefresh)}
          icon={RefreshCw}
        />
        <Detail
          label="Next refresh"
          value={formatTime(source.nextRefresh)}
          icon={Clock3}
        />
        <Detail
          label="Records"
          value={String(source.records)}
          icon={Database}
        />
        <Detail
          label="Latency"
          value={source.latencyMs === null ? "-" : `${source.latencyMs} ms`}
          icon={Clock3}
        />
        <Detail label="Errors" value={String(source.errors)} icon={XCircle} />
        <Detail label="Freshness" value={source.freshness} icon={RefreshCw} />
        <Detail
          label="Refresh cadence"
          value={
            source.refreshMinutes
              ? `${source.refreshMinutes} min`
              : "Source based"
          }
          icon={Clock3}
        />
      </div>
      <div className="mt-4 border-t border-[var(--line)] pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <ShieldCheck size={14} className="text-[var(--blue)]" /> Source
            quality{" "}
            <span className="rounded-full bg-[var(--blue-soft)] px-2 py-0.5 text-[10px] text-[var(--blue)]">
              {source.quality.grade} ·{" "}
              {Math.round(source.quality.qualityScore * 100)}
            </span>
          </div>
          <span className="text-[9px] text-[var(--ink-faint)]">
            Separate from forecast direction
          </span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1">
          {Object.entries(source.quality.components).map(([key, value]) => (
            <div key={key}>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                <div
                  className="h-full bg-[var(--blue)]"
                  style={{ width: `${value * 100}%` }}
                />
              </div>
              <span
                className="mt-1 block truncate text-[8px] text-[var(--ink-faint)]"
                title={key}
              >
                {key.replaceAll(/([A-Z])/g, " $1")}
              </span>
            </div>
          ))}
        </div>
      </div>
      {editing ? (
        <div className="mt-4 grid gap-3 rounded-[8px] bg-[var(--surface-subtle)] p-4 sm:grid-cols-2">
          <label className="text-[9px] font-bold uppercase text-[var(--ink-faint)]">
            Refresh minutes
            <input
              type="number"
              min="1"
              max="43200"
              value={refreshMinutes}
              onChange={(event) =>
                setRefreshMinutes(Number(event.target.value))
              }
              className="mt-1 h-9 w-full rounded-[7px] border border-[var(--line)] bg-white px-2 text-xs"
            />
          </label>
          <label className="text-[9px] font-bold uppercase text-[var(--ink-faint)]">
            Configured reliability · {Math.round(reliability * 100)}%
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={reliability}
              onChange={(event) => setReliability(Number(event.target.value))}
              className="mt-3 w-full accent-[var(--teal)]"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              onAction(source.id, "edit", {
                refreshMinutes,
                configuredReliability: reliability,
              })
            }
            className="flex h-9 items-center justify-center gap-2 rounded-[7px] bg-[var(--navy)] text-xs font-bold text-white sm:col-span-2"
          >
            <Save size={14} /> Save non-secret configuration
          </button>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Action
          icon={CheckCircle2}
          label="Test Connection"
          disabled={busy || source.commercial}
          onClick={() => onAction(source.id, "test")}
        />
        <Action
          icon={Play}
          label="Sync Now"
          disabled={busy || source.commercial || !source.enabled}
          onClick={() => onAction(source.id, "sync")}
        />
        <Action
          icon={Power}
          label={source.enabled ? "Disable" : "Enable"}
          disabled={busy || source.commercial}
          onClick={() =>
            onAction(source.id, source.enabled ? "disable" : "enable")
          }
        />
        <Action
          icon={Edit3}
          label="Edit Configuration"
          disabled={busy || source.commercial}
          onClick={onEdit}
        />
        {busy ? (
          <LoaderCircle className="animate-spin text-[var(--teal)]" size={15} />
        ) : null}
      </div>
    </article>
  );
}

function Status({ value }: { value: string }) {
  const positive = value === "enabled";
  return (
    <span
      className={`rounded-full px-2 py-1 text-[8px] font-bold uppercase ${positive ? "bg-[var(--teal-soft)] text-[var(--teal)]" : value === "degraded" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--surface-subtle)] text-[var(--ink-muted)]"}`}
    >
      {value.replaceAll("-", " ")}
    </span>
  );
}
function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Clock3;
}) {
  return (
    <div className="min-w-0">
      <Icon size={11} className="text-[var(--ink-faint)]" />
      <span className="mt-1 block text-[8px] font-bold uppercase text-[var(--ink-faint)]">
        {label}
      </span>
      <span
        className="mt-0.5 block truncate text-[10px] font-semibold"
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
function Action({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: typeof Play;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="dora-floating-control flex h-8 items-center gap-1.5 px-2.5 text-[9px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon size={12} /> {label}
    </button>
  );
}
function formatTime(value: string | null) {
  return value
    ? new Date(value).toLocaleString("en", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";
}
