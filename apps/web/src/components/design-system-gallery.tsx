"use client";

import { BookOpenText, Layers3 } from "lucide-react";
import { useState } from "react";

import {
  AgentActivity,
  ConfidenceIndicator,
  DoraCard,
  EvidenceDrawer,
  ExecutiveBriefCard,
  ForecastCard,
  FreshnessIndicator,
  InsightCard,
  MarketPulse,
  NotificationPanel,
  PriceTicker,
  RiskBadge,
  ScenarioCard,
  SignalCard,
  SourceBadge,
  StateBoundary,
  TrendIndicator,
  type SurfaceState,
} from "@/components/design-system";
import {
  dashboardNotifications,
  evidenceItems,
  forecastSeries,
  marketPulseItems,
  reasoningActivity,
} from "@/lib/dashboard-data";

const states: readonly SurfaceState[] = ["ready", "loading", "empty", "error"];

export function DesignSystemGallery() {
  const [state, setState] = useState<SurfaceState>("ready");
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-5 border-b border-[var(--line)] pb-7 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--teal)]">
            <Layers3 aria-hidden="true" size={14} /> DORA visual language
          </div>
          <h1 className="mt-3 font-serif text-4xl font-medium text-[var(--navy)]">
            Executive intelligence, precisely expressed.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
            Reusable surfaces share one state contract, restrained depth,
            traceable evidence and semantic signal color.
          </p>
        </div>
        <div
          aria-label="Component state"
          className="inline-flex self-start rounded-[9px] border border-white/70 bg-white/60 p-1 shadow-[var(--shadow-control)] backdrop-blur-lg"
        >
          {states.map((item) => (
            <button
              aria-pressed={state === item}
              className={`h-8 rounded-[7px] px-3 text-[10px] font-bold capitalize transition-colors ${state === item ? "bg-[var(--navy)] text-white shadow-sm" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}
              key={item}
              onClick={() => setState(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-xs font-bold text-[var(--ink)]">
          Indicators and compact data
        </h2>
        <div className="mt-3 flex min-h-16 flex-wrap items-center gap-4 rounded-[12px] border border-[var(--line)] bg-white/70 p-4 shadow-[var(--shadow-card)]">
          <RiskBadge level="high" state={state} />
          <ConfidenceIndicator state={state} value={92} />
          <TrendIndicator direction="up" state={state} value="+2.4%" />
          <SourceBadge source="EIA" state={state} />
          <FreshnessIndicator label="18 min" state={state} status="fresh" />
          <NotificationPanel
            notifications={dashboardNotifications}
            state={state}
          />
          <button
            className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-[var(--line)] bg-white px-3 text-xs font-bold"
            onClick={() => setEvidenceOpen(true)}
            type="button"
          >
            <BookOpenText aria-hidden="true" size={14} /> Evidence drawer
          </button>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <PriceTicker
          change="+2.4%"
          direction="up"
          name="Crude oil"
          price={80.82}
          selected
          state={state}
          symbol="WTI"
          unit="barrel"
        />
        <SignalCard
          change="+14 pts"
          direction="up"
          label="Freight pressure"
          risk="high"
          state={state}
          summary="Two routes exceed the monitored lead-time band."
          unit="index"
          value={78}
        />
        <DoraCard contentClassName="p-5" state={state} title="DoraCard">
          <p className="text-xs leading-5 text-[var(--ink-muted)]">
            The foundational surface owns common hierarchy, depth and non-ready
            states.
          </p>
        </DoraCard>
        <DoraCard contentClassName="p-5" title="StateBoundary">
          <StateBoundary state={state}>
            <p className="text-xs leading-5 text-[var(--ink-muted)]">
              The shared boundary prevents bespoke loading and error patterns.
            </p>
          </StateBoundary>
        </DoraCard>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-12">
        <ExecutiveBriefCard
          brief="Crude strength and freight constraints narrow the Rotterdam decision window. Current inventory cover keeps exposure manageable while other monitored markets remain inside tolerance."
          className="lg:col-span-8"
          confidence={92}
          defaultStreaming={false}
          generatedAt="08:40 UTC"
          onEvidence={() => setEvidenceOpen(true)}
          sourceCount={6}
          state={state}
          title="Focused action is justified; broad escalation is not."
        />
        <AgentActivity
          activities={reasoningActivity}
          className="lg:col-span-4"
          state={state}
        />
        <ForecastCard
          className="lg:col-span-7"
          currentValue={80.82}
          data={forecastSeries}
          description="Deterministic baseline"
          horizon="14 days"
          projectedValue={82.6}
          state={state}
          title="ForecastCard"
          unit="USD/bbl"
        />
        <MarketPulse
          className="lg:col-span-5"
          items={marketPulseItems}
          state={state}
        />
        <InsightCard
          className="lg:col-span-5"
          confidence={88}
          evidenceCount={4}
          eyebrow="InsightCard"
          onEvidence={() => setEvidenceOpen(true)}
          source="DORA composite"
          state={state}
          summary="Evidence-backed interpretation remains separate from authoritative calculations."
          title="A clear decision statement with visible confidence."
        />
        <ScenarioCard
          className="lg:col-span-7"
          defaultOpen
          description="Conditional deterministic analysis"
          impacts={[
            { label: "Landed cost", value: "+1.8%", direction: "up" },
            { label: "Exposure", value: "-42%", direction: "down" },
            { label: "Capital", value: "+$1.2m", direction: "up" },
          ]}
          inputs={[
            { label: "Forward cover", value: "+10%" },
            { label: "Lead time", value: "+3 days" },
          ]}
          state={state}
          title="ScenarioCard"
        />
      </section>

      <EvidenceDrawer
        evidence={evidenceItems}
        onOpenChange={setEvidenceOpen}
        open={evidenceOpen}
        state={state}
        title="Design-system evidence"
      />
    </main>
  );
}
