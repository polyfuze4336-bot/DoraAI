"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Check,
  ChevronRight,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

interface DoraAlert {
  alertId: string;
  type: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  commodity: string | null;
  reason: string;
  timestamp: string;
  evidence: string[];
  recommendedNextAction: string;
  occurrenceCount: number;
  status: "open" | "acknowledged";
  lastOccurredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export function AlertsWorkspace() {
  const [alerts, setAlerts] = useState<DoraAlert[]>([]);
  const [filter, setFilter] = useState<"open" | "acknowledged" | "all">("open");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    void load();
  }, []);
  async function load() {
    const response = await fetch("/api/alerts");
    const payload = (await response.json()) as { alerts: DoraAlert[] };
    setAlerts(payload.alerts);
  }
  async function acknowledge(alertId: string) {
    setBusy(alertId);
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        alertId,
        acknowledgedBy: "local-management-user",
      }),
    });
    await load();
    setBusy("");
  }
  const visible = alerts.filter(
    (alert) => filter === "all" || alert.status === filter,
  );

  return (
    <main className="min-h-screen bg-[var(--canvas)]">
      <header className="border-b border-[var(--line)] bg-[rgba(252,253,250,.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1300px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              aria-label="Back to command centre"
              className="dora-floating-control grid size-9 place-items-center"
            >
              <ArrowLeft size={17} />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--danger)]">
                <BellRing size={14} /> Attention management
              </div>
              <h1 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">
                DORA alerts
              </h1>
            </div>
          </div>
          <span className="rounded-full bg-[var(--danger-soft)] px-3 py-1 text-[10px] font-bold text-[var(--danger)]">
            {alerts.filter((item) => item.status === "open").length} open
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-[1300px] px-5 py-7 lg:px-8">
        <div className="flex gap-1 border-b border-[var(--line)] pb-4">
          {(["open", "acknowledged", "all"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-[7px] px-3 py-2 text-[10px] font-bold capitalize ${filter === item ? "bg-[var(--navy)] text-white" : "text-[var(--ink-muted)]"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {visible.map((alert) => (
            <article
              key={alert.alertId}
              className="grid gap-4 py-5 md:grid-cols-[130px_minmax(0,1fr)_190px] md:items-start"
            >
              <div>
                <Severity value={alert.severity} />
                <span className="mt-2 block text-[9px] font-bold uppercase text-[var(--ink-faint)]">
                  {alert.type.replaceAll("-", " ")}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-[var(--navy)]">
                    {alert.commodity ?? "System"}
                  </h2>
                  {alert.occurrenceCount > 1 ? (
                    <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[9px]">
                      {alert.occurrenceCount} occurrences · deduplicated
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  {alert.reason}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--ink-faint)]">
                  <Clock3 size={11} />{" "}
                  {new Date(alert.lastOccurredAt).toLocaleString("en")}
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-bold text-[var(--blue)]">
                    Evidence ({alert.evidence.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-[var(--ink-muted)]">
                    {alert.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
              </div>
              <div className="rounded-[8px] bg-[var(--surface-subtle)] p-4">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-[var(--teal)]">
                  <ShieldCheck size={12} /> Next action
                </div>
                <p className="mt-2 text-xs leading-5">
                  {alert.recommendedNextAction}
                </p>
                {alert.status === "open" ? (
                  <button
                    disabled={busy === alert.alertId}
                    type="button"
                    onClick={() => acknowledge(alert.alertId)}
                    className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-[7px] bg-[var(--navy)] text-[10px] font-bold text-white"
                  >
                    <Check size={12} /> Acknowledge
                  </button>
                ) : (
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[var(--teal)]">
                    <Check size={12} /> Acknowledged
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
        {!visible.length ? (
          <div className="py-20 text-center">
            <AlertTriangle className="mx-auto text-[var(--teal)]" size={26} />
            <p className="mt-3 text-sm font-bold">No alerts in this view</p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Deduplication and cooldown policies reduce repeated notifications.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
function Severity({ value }: { value: DoraAlert["severity"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold uppercase ${value === "critical" || value === "high" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : value === "medium" ? "bg-[var(--amber-soft)] text-[var(--amber)]" : "bg-[var(--teal-soft)] text-[var(--teal)]"}`}
    >
      {value}
      <ChevronRight size={10} />
    </span>
  );
}
