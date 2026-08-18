"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import {
  Activity,
  ArrowRight,
  Calculator,
  Check,
  ChevronDown,
  CircleDashed,
  Gauge,
  Play,
  Radar,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AnimatedNumber } from "./animated-number";
import { DoraCard } from "./dora-card";
import type { SurfaceState } from "./foundation";
import {
  ConfidenceIndicator,
  RiskBadge,
  SourceBadge,
  TrendIndicator,
  type RiskLevel,
  type TrendDirection,
} from "./indicators";
import { cn } from "./utils";

interface StatefulCardProps {
  readonly state?: SurfaceState;
  readonly className?: string;
}

export function InsightCard({
  eyebrow,
  title,
  summary,
  confidence,
  source,
  evidenceCount,
  state = "ready",
  className,
  onEvidence,
}: StatefulCardProps & {
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly confidence: number;
  readonly source: string;
  readonly evidenceCount: number;
  readonly onEvidence?: () => void;
}) {
  return (
    <DoraCard
      className={className}
      contentClassName="px-5 pb-5 sm:px-6 sm:pb-6"
      elevated
      emptyDescription="A grounded insight will appear after enough evidence is collected."
      emptyTitle="No insight generated"
      errorDescription="DORA preserved the evidence bundle and will retry reasoning."
      errorTitle="Insight generation paused"
      state={state}
    >
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--teal)]">
        <Sparkles aria-hidden="true" size={14} />
        {eyebrow}
      </div>
      <h3 className="mt-4 max-w-2xl font-serif text-[26px] font-medium leading-[1.12] text-[var(--ink)]">
        {title}
      </h3>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
        {summary}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line-soft)] pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={source} />
          <span className="text-[10px] font-semibold text-[var(--ink-muted)]">
            {evidenceCount} evidence references
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ConfidenceIndicator value={confidence} />
          {onEvidence ? (
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-[7px] border border-[var(--line)] bg-white px-3 text-xs font-bold text-[var(--ink)] transition-colors hover:bg-[var(--surface-subtle)]"
              onClick={onEvidence}
              type="button"
            >
              Explain <ArrowRight aria-hidden="true" size={13} />
            </button>
          ) : null}
        </div>
      </div>
    </DoraCard>
  );
}

export function SignalCard({
  label,
  value,
  unit,
  summary,
  risk,
  direction,
  change,
  state = "ready",
  className,
  onEvidence,
}: StatefulCardProps & {
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly summary: string;
  readonly risk: RiskLevel;
  readonly direction: TrendDirection;
  readonly change: string;
  readonly onEvidence?: () => void;
}) {
  return (
    <DoraCard
      as="article"
      className={className}
      contentClassName="p-5"
      emptyDescription="No threshold or anomaly has been detected."
      emptyTitle="No active signal"
      errorDescription="Signal computation will resume after the data-quality check."
      errorTitle="Signal unavailable"
      state={state}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold text-[var(--ink-muted)]">
          {label}
        </div>
        <RiskBadge level={risk} />
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <AnimatedNumber
            className="font-serif text-3xl font-medium"
            value={value}
          />
          <span className="ml-1 text-xs font-semibold text-[var(--ink-muted)]">
            {unit}
          </span>
        </div>
        <TrendIndicator direction={direction} value={change} />
      </div>
      <p className="mt-4 border-t border-[var(--line-soft)] pt-3 text-xs leading-5 text-[var(--ink-muted)]">
        {summary}
      </p>
      {onEvidence ? (
        <button
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[7px] border border-[var(--line)] bg-white px-3 text-xs font-bold text-[var(--ink)] transition-colors hover:bg-[var(--surface-subtle)]"
          onClick={onEvidence}
          type="button"
        >
          Explain <ArrowRight aria-hidden="true" size={13} />
        </button>
      ) : null}
    </DoraCard>
  );
}

export interface ForecastPoint {
  readonly label: string;
  readonly actual: number | null;
  readonly forecast: number | null;
  readonly lower?: number | null;
  readonly upper?: number | null;
}

export function ForecastCard({
  title,
  description,
  currentValue,
  projectedValue,
  unit,
  horizon,
  data,
  state = "ready",
  className,
}: StatefulCardProps & {
  readonly title: string;
  readonly description: string;
  readonly currentValue: number;
  readonly projectedValue: number;
  readonly unit: string;
  readonly horizon: string;
  readonly data: readonly ForecastPoint[];
}) {
  const direction: TrendDirection =
    projectedValue >= currentValue ? "up" : "down";
  const delta = ((projectedValue - currentValue) / currentValue) * 100;
  const chartData = data.map((point) => ({
    ...point,
    uncertainty:
      point.lower !== null &&
      point.lower !== undefined &&
      point.upper !== null &&
      point.upper !== undefined
        ? [point.lower, point.upper]
        : null,
  }));

  return (
    <DoraCard
      action={
        <span className="text-[10px] font-bold text-[var(--ink-muted)]">
          {horizon}
        </span>
      }
      className={className}
      contentClassName="px-4 pb-5 sm:px-5"
      description={description}
      emptyDescription="Select a commodity and forecast horizon to begin."
      emptyTitle="No forecast configured"
      errorDescription="The last validated forecast remains available in history."
      errorTitle="Forecast engine unavailable"
      state={state}
      title={title}
    >
      <div className="mb-2 flex items-end justify-between px-1">
        <div>
          <AnimatedNumber
            className="font-serif text-3xl font-medium"
            format={(value) => value.toFixed(2)}
            value={projectedValue}
          />
          <span className="ml-1 text-xs text-[var(--ink-muted)]">{unit}</span>
        </div>
        <TrendIndicator
          direction={direction}
          value={`${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`}
        />
      </div>
      <div
        aria-label={`${title} forecast chart`}
        className="h-[210px] w-full"
        role="img"
      >
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart
            data={chartData}
            margin={{ bottom: 0, left: -22, right: 6, top: 12 }}
          >
            <CartesianGrid
              stroke="var(--line-soft)"
              strokeDasharray="3 5"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="label"
              fontSize={10}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              fontSize={10}
              tickLine={false}
              tickMargin={6}
            />
            <ChartTooltip
              contentStyle={{
                background: "rgba(255,255,255,.94)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                boxShadow: "var(--shadow-float)",
                fontSize: 11,
              }}
            />
            <Area
              dataKey="uncertainty"
              fill="var(--cyan-soft)"
              fillOpacity={0.72}
              isAnimationActive={false}
              name="Uncertainty range"
              stroke="none"
              type="monotone"
            />
            <Area
              dataKey="actual"
              fill="var(--teal-soft)"
              stroke="var(--teal)"
              strokeWidth={2.2}
              type="monotone"
            />
            <Area
              dataKey="forecast"
              fill="var(--cyan-soft)"
              stroke="var(--cyan)"
              strokeDasharray="5 4"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center gap-2 px-1 text-[9px] text-[var(--ink-muted)]">
        <span className="h-2.5 w-4 rounded-[3px] bg-[var(--cyan-soft)]" />
        Uncertainty range, not a point-price prediction
      </div>
    </DoraCard>
  );
}

export function ScenarioCard({
  title,
  description,
  inputs,
  impacts,
  state = "ready",
  className,
  defaultOpen = false,
}: StatefulCardProps & {
  readonly title: string;
  readonly description: string;
  readonly inputs: readonly { label: string; value: string }[];
  readonly impacts: readonly {
    label: string;
    value: string;
    direction: TrendDirection;
  }[];
  readonly defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <DoraCard
      className={className}
      contentClassName="px-5 pb-5"
      emptyDescription="Create a scenario to compare conditional outcomes."
      emptyTitle="No scenario selected"
      errorDescription="Inputs are preserved and can be recalculated when the engine recovers."
      errorTitle="Scenario calculation interrupted"
      state={state}
    >
      <Collapsible.Root onOpenChange={setOpen} open={open}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--blue)]">
              <Calculator aria-hidden="true" size={13} /> Scenario
            </div>
            <h3 className="mt-2 text-sm font-bold">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
              {description}
            </p>
          </div>
          <Collapsible.Trigger asChild>
            <button
              aria-label={open ? "Collapse scenario" : "Expand scenario"}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[7px] border border-[var(--line)] text-[var(--ink-muted)] hover:bg-[var(--surface-subtle)]"
              type="button"
            >
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "transition-transform duration-200",
                  open && "rotate-180",
                )}
                size={16}
              />
            </button>
          </Collapsible.Trigger>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {impacts.map((impact) => (
            <div
              className="border-l-2 border-[var(--line-strong)] pl-3"
              key={impact.label}
            >
              <div className="text-[10px] font-semibold text-[var(--ink-muted)]">
                {impact.label}
              </div>
              <TrendIndicator
                className="mt-1"
                direction={impact.direction}
                value={impact.value}
              />
            </div>
          ))}
        </div>

        <Collapsible.Content>
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 border-t border-[var(--line-soft)] pt-4"
            initial={{ opacity: 0, y: -4 }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {inputs.map((input) => (
                <div
                  className="flex items-center justify-between rounded-[8px] bg-[var(--surface-subtle)] px-3 py-2.5"
                  key={input.label}
                >
                  <span className="text-xs text-[var(--ink-muted)]">
                    {input.label}
                  </span>
                  <span className="text-xs font-bold text-[var(--ink)]">
                    {input.value}
                  </span>
                </div>
              ))}
            </div>
            <button
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-[7px] bg-[var(--navy)] px-3 text-xs font-bold text-white hover:bg-[var(--navy-soft)]"
              type="button"
            >
              <Play aria-hidden="true" size={13} /> Recalculate
            </button>
          </motion.div>
        </Collapsible.Content>
      </Collapsible.Root>
    </DoraCard>
  );
}

export function MarketPulse({
  items,
  state = "ready",
  className,
}: StatefulCardProps & {
  readonly items: readonly {
    label: string;
    value: number;
    descriptor: string;
    risk: RiskLevel;
  }[];
}) {
  return (
    <DoraCard
      action={
        <Radar
          aria-hidden="true"
          className="text-[var(--ink-muted)]"
          size={18}
        />
      }
      className={className}
      contentClassName="px-5 pb-5"
      description="Composite signals across price, supply, demand and operations"
      emptyDescription="Pulse factors will appear after signal enrichment."
      emptyTitle="Market pulse not established"
      errorDescription="One or more pulse factors failed quality validation."
      errorTitle="Market pulse degraded"
      state={state}
      title="Market pulse"
    >
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold">{item.label}</span>
                <span className="ml-2 text-[10px] text-[var(--ink-muted)]">
                  {item.descriptor}
                </span>
              </div>
              <RiskBadge level={item.risk} />
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
              <motion.div
                animate={{ width: `${item.value}%` }}
                className="h-full rounded-full bg-[var(--teal)]"
                initial={{ width: 0 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </DoraCard>
  );
}

export interface AgentActivityItem {
  readonly label: string;
  readonly detail: string;
  readonly status: "complete" | "running" | "queued";
}

export function AgentActivity({
  activities,
  state = "ready",
  className,
}: StatefulCardProps & { readonly activities: readonly AgentActivityItem[] }) {
  return (
    <DoraCard
      action={
        <Activity aria-hidden="true" className="text-[var(--teal)]" size={18} />
      }
      className={className}
      contentClassName="px-5 pb-5"
      description="Shared reasoning pipeline, not autonomous domain agents"
      emptyDescription="Reasoning activity appears when a brief or analysis is requested."
      emptyTitle="Reasoning layer is idle"
      errorDescription="Deterministic intelligence remains available while reasoning recovers."
      errorTitle="Reasoning activity interrupted"
      state={state}
      title="Reasoning activity"
    >
      <ol className="space-y-4">
        {activities.map((item, index) => (
          <li className="relative flex gap-3" key={`${item.label}-${index}`}>
            {index < activities.length - 1 ? (
              <span className="absolute left-[9px] top-5 h-[calc(100%+4px)] w-px bg-[var(--line)]" />
            ) : null}
            <span
              className={cn(
                "relative z-10 mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border bg-white",
                item.status === "complete"
                  ? "border-[var(--teal-line)] text-[var(--teal)]"
                  : item.status === "running"
                    ? "animate-pulse border-[var(--cyan)] text-[var(--cyan)]"
                    : "border-[var(--line)] text-[var(--ink-muted)]",
              )}
            >
              {item.status === "complete" ? (
                <Check aria-hidden="true" size={11} strokeWidth={3} />
              ) : item.status === "running" ? (
                <Gauge aria-hidden="true" size={11} />
              ) : (
                <CircleDashed aria-hidden="true" size={11} />
              )}
            </span>
            <div>
              <div className="text-xs font-bold text-[var(--ink)]">
                {item.label}
              </div>
              <p className="mt-0.5 text-[10px] leading-4 text-[var(--ink-muted)]">
                {item.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </DoraCard>
  );
}
