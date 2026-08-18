"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { usePathname } from "next/navigation";
import {
  ArrowUp,
  BarChart3,
  BookOpenText,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  LoaderCircle,
  MessageSquareText,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import type { DoraAgentAnswer, DoraAgentStreamEvent } from "@dora/agents";

const commodities = ["BRENT", "WTI", "NG", "CU", "AL", "NI"];
const suggestions = [
  "Why is Brent forecast to increase?",
  "What changed since yesterday?",
  "What signals contradict the bullish outlook?",
  "What are the top feedstock risks over 30 days?",
  "What would happen if oil rises another 10%?",
  "Summarise the market for management.",
];

export function AskDora() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([
    "BRENT",
  ]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [answer, setAnswer] = useState<DoraAgentAnswer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOpen(new URLSearchParams(window.location.search).get("ask") === "1");
  }, []);

  async function ask(event?: FormEvent) {
    event?.preventDefault();
    if (!question.trim() || busy) return;
    setBusy(true);
    setError("");
    setAnswer(null);
    setStreamedText("");
    setStatus("Opening DORA evidence tools");
    try {
      const response = await fetch("/api/ask-dora", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question,
          commodityIds: selectedCommodities,
          dateFrom: dateFrom
            ? new Date(`${dateFrom}T00:00:00Z`).toISOString()
            : undefined,
          dateTo: dateTo
            ? new Date(`${dateTo}T23:59:59Z`).toISOString()
            : undefined,
        }),
      });
      if (!response.ok || !response.body)
        throw new Error("DORA analysis is unavailable.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) {
          const event = JSON.parse(line) as DoraAgentStreamEvent;
          if (event.type === "status") setStatus(event.message);
          if (event.type === "delta") {
            setStatus("");
            setStreamedText((current) => current + event.text);
          }
          if (event.type === "answer") {
            setAnswer(event.answer);
            setStreamedText("");
            setStatus("");
          }
          if (event.type === "error") throw new Error(event.message);
        }
        if (done) break;
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "DORA analysis failed.",
      );
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  function selectQuestion(value: string) {
    setQuestion(value);
    setAnswer(null);
  }

  if (pathname === "/login") return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-full bg-[var(--navy)] px-5 text-sm font-bold text-white shadow-[var(--shadow-float)] transition-transform hover:-translate-y-0.5"
          type="button"
        >
          <Sparkles size={17} /> Ask DORA
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(13,38,56,.28)] backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-y-2 right-2 z-50 flex w-[calc(100%-16px)] max-w-[720px] flex-col overflow-hidden rounded-[12px] bg-[var(--surface)] shadow-[var(--shadow-drawer)] outline-none sm:inset-y-0 sm:right-0 sm:w-full sm:rounded-none">
          <header className="flex items-start justify-between border-b border-[var(--line)] px-5 py-5 sm:px-7">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--teal)]">
                <MessageSquareText size={15} /> Embedded intelligence analyst
              </div>
              <Dialog.Title className="mt-1 font-serif text-3xl text-[var(--navy)]">
                Ask DORA
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-[var(--ink-muted)]">
                Evidence-led market analysis, forecasts and management context.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="dora-floating-control grid size-9 place-items-center"
              aria-label="Close Ask DORA"
            >
              <X size={17} />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="flex flex-wrap gap-2">
              {commodities.map((commodity) => {
                const active = selectedCommodities.includes(commodity);
                return (
                  <button
                    key={commodity}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setSelectedCommodities(
                        active
                          ? selectedCommodities.filter(
                              (item) => item !== commodity,
                            )
                          : [...selectedCommodities, commodity],
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${active ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--line)] text-[var(--ink-muted)]"}`}
                  >
                    {commodity}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex gap-3">
              <DateField label="From" value={dateFrom} onChange={setDateFrom} />
              <DateField label="To" value={dateTo} onChange={setDateTo} />
            </div>

            {!answer && !busy ? (
              <section className="mt-7">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--navy)]">
                  <CircleHelp size={15} /> Suggested by current market activity
                </div>
                <div className="mt-3 divide-y divide-[var(--line-soft)] border-y border-[var(--line)]">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => selectQuestion(item)}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm text-[var(--ink)] hover:text-[var(--teal)]"
                    >
                      {item}
                      <ChevronRight size={14} />
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {status ? (
              <div className="mt-7 flex items-center gap-3 border-y border-[var(--line)] py-6 text-sm text-[var(--ink-muted)]">
                <LoaderCircle
                  className="animate-spin text-[var(--teal)]"
                  size={18}
                />
                {status}
              </div>
            ) : null}
            {streamedText ? (
              <div className="mt-7 border-y border-[var(--line)] py-6 font-serif text-2xl leading-tight text-[var(--navy)]">
                {streamedText}
                <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-[var(--teal)]" />
              </div>
            ) : null}
            {error ? (
              <div className="mt-5 rounded-[8px] border border-[var(--danger-line)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
                {error}
              </div>
            ) : null}
            {answer ? (
              <AgentAnswer answer={answer} onFollowUp={selectQuestion} />
            ) : null}
          </div>

          <form
            onSubmit={ask}
            className="border-t border-[var(--line)] bg-[rgba(252,253,250,.96)] p-4 sm:p-5"
          >
            <div className="relative">
              <Search
                className="absolute left-4 top-4 text-[var(--ink-faint)]"
                size={17}
              />
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={2}
                placeholder="Ask a decision question..."
                className="w-full resize-none rounded-[8px] border border-[var(--line-strong)] bg-white py-3 pl-11 pr-14 text-sm leading-6 outline-none focus:border-[var(--teal)]"
              />
              <button
                type="submit"
                disabled={!question.trim() || busy}
                aria-label="Ask DORA"
                className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-[8px] bg-[var(--teal)] text-white disabled:opacity-40"
              >
                <ArrowUp size={17} />
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AgentAnswer({
  answer,
  onFollowUp,
}: {
  answer: DoraAgentAnswer;
  onFollowUp: (value: string) => void;
}) {
  const sections = [
    ["Observed Data", answer.sections.observedData],
    ["Inference", answer.sections.inference],
    ["Forecast", answer.sections.forecast],
    ["Recommendation", answer.sections.recommendation],
  ] as const;
  return (
    <article className="mt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-[var(--teal-soft)] px-3 py-1 text-[10px] font-bold uppercase text-[var(--teal)]">
          {answer.mode === "foundry"
            ? "Foundry synthesis"
            : "Deterministic synthesis"}
        </span>
        <span className="text-[10px] text-[var(--ink-faint)]">
          Confidence {Math.round(answer.reasoningSummary.confidence * 100)}%
        </span>
      </div>
      <h2 className="mt-4 font-serif text-2xl leading-tight text-[var(--navy)]">
        {answer.summary}
      </h2>
      <div className="mt-6 space-y-6">
        {sections.map(([title, items]) => (
          <section key={title}>
            <h3 className="border-b border-[var(--line)] pb-2 text-[10px] font-bold uppercase text-[var(--ink-faint)]">
              {title}
            </h3>
            {items.length ? (
              <ul className="mt-3 space-y-2 text-sm leading-6">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-[var(--ink-faint)]">
                No supported evidence for this section.
              </p>
            )}
          </section>
        ))}
      </div>
      {answer.principalDrivers.length ? (
        <section className="mt-7">
          <h3 className="text-xs font-bold text-[var(--navy)]">
            Principal drivers
          </h3>
          <ol className="mt-3 space-y-2">
            {answer.principalDrivers.map((driver, index) => (
              <li key={driver} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--navy)] text-[10px] font-bold text-white">
                  {index + 1}
                </span>
                <span>{driver}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {answer.inlineChart.length ? (
        <section className="mt-7">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--navy)]">
            <BarChart3 size={15} /> Forecast range
          </div>
          <div className="mt-4 flex h-32 items-end gap-3 border-b border-[var(--line)]">
            {answer.inlineChart.map((point) => {
              const extent = Math.max(
                ...answer.inlineChart.map((item) => item.value),
                1,
              );
              return (
                <div
                  className="flex flex-1 flex-col items-center"
                  key={point.label}
                >
                  <span className="mb-1 text-[9px] font-bold tabular-nums">
                    {point.value.toFixed(1)}
                  </span>
                  <div
                    className="w-full max-w-12 bg-[var(--teal)]"
                    style={{
                      height: `${Math.max(12, (point.value / extent) * 90)}px`,
                    }}
                  />
                  <span className="mt-2 text-[9px] text-[var(--ink-faint)]">
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      <details className="mt-7 border-y border-[var(--line)] py-4">
        <summary className="cursor-pointer text-xs font-bold text-[var(--navy)]">
          Reasoning Summary
        </summary>
        <div className="mt-4 space-y-3 text-xs leading-5">
          <Summary
            label="Observed evidence"
            items={answer.reasoningSummary.observedEvidence}
          />
          <Summary
            label="Relevant drivers"
            items={answer.reasoningSummary.relevantDrivers}
          />
          <Summary
            label="Conflicting indicators"
            items={answer.reasoningSummary.conflictingIndicators}
          />
          <p>
            <strong>Conclusion:</strong> {answer.reasoningSummary.conclusion}
          </p>
          <Summary
            label="Uncertainties"
            items={answer.reasoningSummary.uncertainties}
          />
        </div>
      </details>
      <section className="mt-7">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--navy)]">
          <BookOpenText size={15} /> Evidence
        </div>
        <div className="mt-3 space-y-2">
          {answer.citations.map((citation) => (
            <details
              key={citation.id}
              className="rounded-[8px] border border-[var(--line)] p-3"
            >
              <summary className="cursor-pointer text-xs font-semibold">
                {citation.label}
              </summary>
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                {citation.excerpt}
              </p>
              {citation.sourceUrl ? (
                <a
                  href={citation.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--blue)]"
                >
                  Open source <ExternalLink size={10} />
                </a>
              ) : null}
            </details>
          ))}
        </div>
      </section>
      {answer.riskFactors.length ? (
        <section className="mt-7">
          <h3 className="text-xs font-bold text-[var(--navy)]">Risk factors</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {answer.riskFactors.map((item) => (
              <span
                key={item}
                className="rounded-full bg-[var(--danger-soft)] px-3 py-1 text-[10px] font-semibold text-[var(--danger)]"
              >
                {item}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      <section className="mt-7">
        <h3 className="text-xs font-bold text-[var(--navy)]">
          What could invalidate this view
        </h3>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-[var(--ink-muted)]">
          {answer.invalidationConditions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="mt-7">
        <h3 className="text-[10px] font-bold uppercase text-[var(--ink-faint)]">
          Follow-up questions
        </h3>
        <div className="mt-2 space-y-1">
          {answer.followUpQuestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onFollowUp(item)}
              className="flex w-full items-center justify-between py-2 text-left text-xs font-semibold text-[var(--blue)]"
            >
              {item}
              <ChevronRight size={13} />
            </button>
          ))}
        </div>
      </section>
      {answer.relatedAnalysis.length ? (
        <section className="mt-5">
          <h3 className="text-[10px] font-bold uppercase text-[var(--ink-faint)]">
            Related analysis
          </h3>
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            {answer.relatedAnalysis.join(" · ")}
          </p>
        </section>
      ) : null}
    </article>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex-1 text-[9px] font-bold uppercase text-[var(--ink-faint)]">
      <span className="flex items-center gap-1">
        <CalendarDays size={11} /> {label}
      </span>
      <input
        aria-label={`${label} date`}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-[8px] border border-[var(--line)] bg-white px-2 text-xs text-[var(--ink)]"
      />
    </label>
  );
}
function Summary({
  label,
  items,
}: {
  label: string;
  items: readonly string[];
}) {
  return (
    <div>
      <strong>{label}:</strong>{" "}
      {items.length ? items.join(" ") : "None identified."}
    </div>
  );
}
