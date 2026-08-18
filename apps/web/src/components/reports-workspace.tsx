"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileText,
  LoaderCircle,
  Mail,
  RefreshCw,
  Send,
} from "lucide-react";
import { useEffect, useState } from "react";

interface WeeklyBrief {
  reportId: string;
  title: string;
  generatedAt: string;
  asOf: string;
  timezone: string;
  html: string;
  status: string;
  deliveryStatus: string;
  recipients: string[];
  sentAt?: string;
}

export function ReportsWorkspace() {
  const [reports, setReports] = useState<WeeklyBrief[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const response = await fetch("/api/reports");
    const payload = (await response.json()) as { reports: WeeklyBrief[] };
    setReports(payload.reports);
    setSelectedId((current) => current || payload.reports[0]?.reportId || "");
  }

  async function action(value: "regenerate" | "send-test" | "send") {
    setBusy(value);
    setMessage("");
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: value,
        reportId: selectedId || undefined,
      }),
    });
    const payload = (await response.json()) as {
      report?: WeeklyBrief;
      message?: string;
      error?: string;
    };
    setMessage(
      payload.error ??
        payload.message ??
        (response.ok ? "Report updated." : "Report action failed."),
    );
    await load();
    if (payload.report) setSelectedId(payload.report.reportId);
    setBusy(null);
  }

  const selected =
    reports.find((report) => report.reportId === selectedId) ?? reports[0];

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
                <FileText size={14} /> Executive publishing
              </div>
              <h1 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">
                Management reports
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => action("regenerate")}
            disabled={Boolean(busy)}
            className="flex h-10 items-center gap-2 rounded-[8px] bg-[var(--navy)] px-4 text-xs font-bold text-white disabled:opacity-50"
          >
            {busy === "regenerate" ? (
              <LoaderCircle className="animate-spin" size={15} />
            ) : (
              <RefreshCw size={15} />
            )}{" "}
            Regenerate
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] min-w-0 gap-6 px-5 py-7 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8">
        <aside className="min-w-0 border-r border-[var(--line)] pr-5">
          <h2 className="text-xs font-bold uppercase text-[var(--ink-faint)]">
            Previous reports
          </h2>
          <div className="mt-3 divide-y divide-[var(--line-soft)] border-y border-[var(--line)]">
            {reports.map((report) => (
              <button
                key={report.reportId}
                type="button"
                onClick={() => setSelectedId(report.reportId)}
                className={`w-full py-4 text-left ${selected?.reportId === report.reportId ? "text-[var(--teal)]" : "text-[var(--ink)]"}`}
              >
                <span className="block text-xs font-bold">
                  Week of {formatDate(report.asOf)}
                </span>
                <span className="mt-1 block text-[10px] text-[var(--ink-faint)]">
                  {formatDate(report.generatedAt)} · {report.deliveryStatus}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
                <div>
                  <h2 className="font-serif text-2xl text-[var(--navy)]">
                    {selected.title}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    Generated {formatDateTime(selected.generatedAt)} ·{" "}
                    {selected.timezone}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-[10px] font-bold uppercase text-[var(--ink-muted)]">
                  {selected.deliveryStatus}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => action("send-test")}
                  disabled={Boolean(busy)}
                  className="dora-floating-control flex h-9 items-center gap-2 px-3 text-xs font-bold"
                >
                  <Mail size={14} /> Send Test
                </button>
                <button
                  type="button"
                  onClick={() => action("send")}
                  disabled={Boolean(busy)}
                  className="dora-floating-control flex h-9 items-center gap-2 px-3 text-xs font-bold"
                >
                  <Send size={14} /> Send
                </button>
                <a
                  href={`/api/reports/${selected.reportId}/download`}
                  className="dora-floating-control flex h-9 items-center gap-2 px-3 text-xs font-bold"
                >
                  <Download size={14} /> Download HTML
                </a>
              </div>
              {message ? (
                <div className="mt-4 rounded-[8px] border border-[var(--amber-line)] bg-[var(--amber-soft)] p-3 text-xs">
                  {message}
                </div>
              ) : null}
              <div className="mt-5 overflow-hidden rounded-[8px] border border-[var(--line)] bg-white shadow-[var(--shadow-card)]">
                <iframe
                  title="Weekly brief preview"
                  srcDoc={selected.html}
                  className="h-[900px] w-full"
                />
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-sm text-[var(--ink-muted)]">
              Generating the first weekly brief...
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
