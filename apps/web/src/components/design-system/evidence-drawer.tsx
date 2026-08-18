"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  Clock3,
  ExternalLink,
  FileText,
  Link2,
  Sigma,
  X,
} from "lucide-react";

import { StateBoundary, type SurfaceState } from "./foundation";
import {
  ConfidenceIndicator,
  FreshnessIndicator,
  SourceBadge,
} from "./indicators";

export interface EvidenceItem {
  readonly id: string;
  readonly title: string;
  readonly source: string;
  readonly publishedAt: string;
  readonly excerpt: string;
  readonly relevance: number;
  readonly sourceUrl?: string;
}

export interface ReasoningTrace {
  readonly summary: string;
  readonly steps: readonly string[];
  readonly limitations: readonly string[];
}

export interface ExplainableSignal {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly category:
    | "price"
    | "inventory"
    | "supply"
    | "geopolitical"
    | "news"
    | "macro"
    | "manufacturing"
    | "other";
  readonly updatedAt: string;
  readonly freshness: "fresh" | "delayed" | "stale" | "unknown";
}

export interface ModelForecastExplanation {
  readonly model: string;
  readonly modelVersion: string;
  readonly horizon: string;
  readonly forecast: string;
  readonly lowerBound: string;
  readonly upperBound: string;
  readonly confidence: number;
  readonly generatedAt: string;
}

export interface InsightExplanation {
  readonly supportingSignals: readonly ExplainableSignal[];
  readonly contradictingSignals: readonly ExplainableSignal[];
  readonly modelForecast?: ModelForecastExplanation;
  readonly aiInterpretation: {
    readonly observedEvidence: readonly string[];
    readonly relevantDrivers: readonly string[];
    readonly conflictingIndicators: readonly string[];
    readonly conclusion: string;
    readonly confidence: number;
    readonly uncertainties: readonly string[];
  };
}

interface EvidenceDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly evidence: readonly EvidenceItem[];
  readonly state?: SurfaceState;
  readonly title?: string;
  readonly reasoning?: ReasoningTrace;
  readonly explanation?: InsightExplanation;
}

export function EvidenceDrawer({
  open,
  onOpenChange,
  evidence,
  state = "ready",
  title = "Evidence trail",
  reasoning,
  explanation,
}: EvidenceDrawerProps) {
  const effectiveState =
    state === "ready" && evidence.length === 0 ? "empty" : state;
  const effectiveExplanation =
    explanation ?? buildFallbackExplanation(evidence, reasoning);

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(8,19,30,.28)] backdrop-blur-[3px] data-[state=closed]:animate-[fade-out_.18s_ease] data-[state=open]:animate-[fade-in_.18s_ease]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col border-l border-white/60 bg-[rgba(250,251,248,.96)] shadow-[var(--shadow-drawer)] backdrop-blur-xl data-[state=closed]:animate-[drawer-out_.22s_ease] data-[state=open]:animate-[drawer-in_.28s_cubic-bezier(.22,1,.36,1)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-5 sm:px-7 sm:py-6">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--teal)]">
                <Link2 aria-hidden="true" size={13} /> Traceability
              </div>
              <Dialog.Title className="mt-2 font-serif text-2xl font-medium text-[var(--ink)]">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                Supporting and contradicting signals, model output, freshness,
                concise interpretation and sources.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close evidence"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-[var(--line)] bg-white/70 text-[var(--ink-muted)] hover:bg-white hover:text-[var(--ink)]"
                type="button"
              >
                <X aria-hidden="true" size={17} />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            <StateBoundary
              emptyDescription="DORA will attach citations after retrieval completes."
              emptyTitle="No evidence attached"
              errorDescription="Evidence metadata could not be loaded. The insight remains unpublished."
              errorTitle="Evidence trail unavailable"
              loadingRows={6}
              state={effectiveState}
            >
              <ExplanationSections explanation={effectiveExplanation} />
              <div className="mb-3 text-[10px] font-bold uppercase text-[var(--teal)]">
                Sources
              </div>
              <ol className="space-y-3">
                {evidence.map((item, index) => (
                  <li
                    className="rounded-[10px] border border-[var(--line)] bg-white/80 p-4 shadow-[var(--shadow-hairline)]"
                    key={item.id}
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] bg-[var(--navy)] text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <SourceBadge source={item.source} />
                          <FreshnessIndicator
                            label={item.publishedAt}
                            status="fresh"
                          />
                        </div>
                        <h3 className="mt-3 text-sm font-bold leading-5 text-[var(--ink)]">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                          {item.excerpt}
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-3">
                          <ConfidenceIndicator value={item.relevance} />
                          {item.sourceUrl ? (
                            <a
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--blue)] hover:underline"
                              href={item.sourceUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Open source{" "}
                              <ExternalLink aria-hidden="true" size={12} />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--ink-muted)]">
                              <FileText aria-hidden="true" size={12} /> Stored
                              snapshot
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </StateBoundary>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ExplanationSections({
  explanation,
}: {
  readonly explanation: InsightExplanation;
}) {
  return (
    <div className="mb-6 space-y-6 border-b border-[var(--line)] pb-6">
      <SignalSection
        icon={ArrowUpRight}
        signals={explanation.supportingSignals}
        title="Supporting Signals"
        tone="supporting"
      />
      <SignalSection
        icon={ArrowDownRight}
        signals={explanation.contradictingSignals}
        title="Contradicting Signals"
        tone="contradicting"
      />
      <section>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--blue)]">
          <Sigma size={13} /> Model Forecast
        </div>
        {explanation.modelForecast ? (
          <div className="mt-3 rounded-[8px] border border-[var(--blue-line)] bg-[var(--blue-soft)] p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[9px] uppercase text-[var(--ink-faint)]">
                  {explanation.modelForecast.horizon}
                </div>
                <div className="mt-1 text-xl font-bold text-[var(--navy)]">
                  {explanation.modelForecast.forecast}
                </div>
              </div>
              <ConfidenceIndicator
                value={explanation.modelForecast.confidence}
              />
            </div>
            <div className="mt-3 text-xs text-[var(--ink-muted)]">
              Range {explanation.modelForecast.lowerBound} to{" "}
              {explanation.modelForecast.upperBound}
            </div>
            <div className="mt-2 text-[9px] text-[var(--ink-faint)]">
              {explanation.modelForecast.model} v
              {explanation.modelForecast.modelVersion} · generated{" "}
              {formatTimestamp(explanation.modelForecast.generatedAt)}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--ink-faint)]">
            No numerical model forecast was used for this insight.
          </p>
        )}
      </section>
      <section>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--cyan)]">
          <BrainCircuit size={13} /> AI Interpretation
        </div>
        <div className="mt-3 rounded-[8px] border border-[var(--line)] bg-white/70 p-4 text-xs leading-5 text-[var(--ink-muted)]">
          <p>{explanation.aiInterpretation.conclusion}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SummaryList
              items={explanation.aiInterpretation.relevantDrivers}
              label="Relevant drivers"
            />
            <SummaryList
              items={explanation.aiInterpretation.conflictingIndicators}
              label="Conflicting indicators"
            />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--line-soft)] pt-3">
            <span>Concise reasoning summary only</span>
            <ConfidenceIndicator
              value={explanation.aiInterpretation.confidence}
            />
          </div>
          {explanation.aiInterpretation.uncertainties.length ? (
            <div className="mt-3 rounded-[6px] bg-[var(--amber-soft)] p-3">
              <div className="text-[9px] font-bold uppercase text-[var(--amber)]">
                Uncertainties
              </div>
              <ul className="mt-1 space-y-1">
                {explanation.aiInterpretation.uncertainties.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SignalSection({
  icon: Icon,
  signals,
  title,
  tone,
}: {
  readonly icon: typeof ArrowUpRight;
  readonly signals: readonly ExplainableSignal[];
  readonly title: string;
  readonly tone: "supporting" | "contradicting";
}) {
  return (
    <section>
      <div
        className={`flex items-center gap-2 text-[10px] font-bold uppercase ${tone === "supporting" ? "text-[var(--teal)]" : "text-[var(--amber)]"}`}
      >
        <Icon size={13} /> {title}
      </div>
      {signals.length ? (
        <div className="mt-3 divide-y divide-[var(--line-soft)] border-y border-[var(--line)]">
          {signals.map((signal) => (
            <div className="py-3" key={signal.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[var(--ink)]">
                    {signal.label}
                  </div>
                  <div className="mt-1 text-[10px] leading-4 text-[var(--ink-muted)]">
                    {signal.detail}
                  </div>
                </div>
                <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-[8px] font-bold uppercase text-[var(--ink-muted)]">
                  {signal.category}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[9px] text-[var(--ink-faint)]">
                <Clock3 size={10} /> Updated {formatTimestamp(signal.updatedAt)}
                <FreshnessIndicator
                  label={signal.freshness}
                  status={signal.freshness}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-[var(--ink-faint)]">
          No material {title.toLowerCase()} are attached.
        </p>
      )}
    </section>
  );
}

function SummaryList({
  items,
  label,
}: {
  readonly items: readonly string[];
  readonly label: string;
}) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase text-[var(--ink-faint)]">
        {label}
      </div>
      <ul className="mt-1 space-y-1">
        {items.length ? (
          items.map((item) => <li key={item}>{item}</li>)
        ) : (
          <li>None identified.</li>
        )}
      </ul>
    </div>
  );
}

function buildFallbackExplanation(
  evidence: readonly EvidenceItem[],
  reasoning: ReasoningTrace | undefined,
): InsightExplanation {
  const signals = evidence.map((item, index): ExplainableSignal => ({
    id: item.id,
    label: item.title,
    detail: item.excerpt,
    category: index % 3 === 0 ? "news" : index % 3 === 1 ? "supply" : "macro",
    updatedAt: item.publishedAt,
    freshness: "fresh",
  }));
  return {
    supportingSignals: signals.slice(0, Math.max(1, signals.length - 1)),
    contradictingSignals: signals.slice(-1),
    aiInterpretation: {
      observedEvidence: evidence.map((item) => item.title),
      relevantDrivers: reasoning?.steps.slice(0, 3) ?? [],
      conflictingIndicators: reasoning?.limitations.slice(0, 2) ?? [],
      conclusion:
        reasoning?.summary ??
        "DORA has attached sources but no interpretation summary is available.",
      confidence: evidence.length
        ? Math.round(
            evidence.reduce((sum, item) => sum + item.relevance, 0) /
              evidence.length,
          )
        : 0,
      uncertainties: reasoning?.limitations ?? [],
    },
  };
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("en", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
