import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Database,
  Minus,
  Radio,
} from "lucide-react";

import type { FreshnessStatus } from "@dora/shared";

import type { SurfaceState } from "./foundation";
import { cn } from "./utils";

export type RiskLevel = "critical" | "high" | "medium" | "low" | "info";

const riskStyles: Record<RiskLevel, string> = {
  critical:
    "border-[var(--danger-line)] bg-[var(--danger-soft)] text-[var(--danger)]",
  high: "border-[var(--danger-line)] bg-[var(--danger-soft)] text-[var(--danger)]",
  medium:
    "border-[var(--amber-line)] bg-[var(--amber-soft)] text-[var(--amber)]",
  low: "border-[var(--teal-line)] bg-[var(--teal-soft)] text-[var(--teal)]",
  info: "border-[var(--blue-line)] bg-[var(--blue-soft)] text-[var(--blue)]",
};

interface StatefulIndicatorProps {
  readonly state?: SurfaceState;
  readonly className?: string;
}

export function RiskBadge({
  level,
  label,
  state = "ready",
  className,
}: StatefulIndicatorProps & {
  readonly level: RiskLevel;
  readonly label?: string;
}) {
  if (state === "loading") {
    return (
      <span
        aria-label="Loading risk"
        className="dora-skeleton inline-block h-6 w-16 rounded-full"
      />
    );
  }

  const unavailable = state === "empty" || state === "error";

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-bold capitalize",
        unavailable
          ? "border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--ink-muted)]"
          : riskStyles[level],
        className,
      )}
    >
      {unavailable ? (
        <Minus aria-hidden="true" size={11} />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {unavailable ? "Unknown" : (label ?? level)}
    </span>
  );
}

export function ConfidenceIndicator({
  value,
  state = "ready",
  className,
}: StatefulIndicatorProps & { readonly value: number }) {
  if (state === "loading") {
    return (
      <span
        aria-label="Loading confidence"
        className="dora-skeleton inline-block h-8 w-20 rounded-full"
      />
    );
  }

  const unavailable = state !== "ready";
  const clampedValue = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * 12;
  const dashOffset = circumference - (clampedValue / 100) * circumference;

  return (
    <span
      aria-label={
        unavailable ? "Confidence unavailable" : `${clampedValue}% confidence`
      }
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink-muted)]",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="h-8 w-8 -rotate-90"
        viewBox="0 0 32 32"
      >
        <circle
          cx="16"
          cy="16"
          fill="none"
          r="12"
          stroke="var(--line)"
          strokeWidth="3"
        />
        {!unavailable ? (
          <circle
            className="transition-[stroke-dashoffset] duration-700"
            cx="16"
            cy="16"
            fill="none"
            r="12"
            stroke="var(--teal)"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth="3"
          />
        ) : null}
      </svg>
      <span>{unavailable ? "Unrated" : `${clampedValue}%`}</span>
    </span>
  );
}

export type TrendDirection = "up" | "down" | "flat";

export function TrendIndicator({
  direction,
  value,
  label,
  state = "ready",
  className,
}: StatefulIndicatorProps & {
  readonly direction: TrendDirection;
  readonly value: string;
  readonly label?: string;
}) {
  if (state === "loading") {
    return (
      <span
        aria-label="Loading trend"
        className="dora-skeleton inline-block h-6 w-20 rounded-full"
      />
    );
  }

  if (state !== "ready") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold text-[var(--ink-muted)]",
          className,
        )}
      >
        <Minus aria-hidden="true" size={13} /> Unavailable
      </span>
    );
  }

  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : ArrowRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-bold",
        direction === "up"
          ? "text-[var(--teal)]"
          : direction === "down"
            ? "text-[var(--danger)]"
            : "text-[var(--ink-muted)]",
        className,
      )}
    >
      <Icon aria-hidden="true" size={14} />
      {value}
      {label ? (
        <span className="font-medium text-[var(--ink-muted)]">{label}</span>
      ) : null}
    </span>
  );
}

export function SourceBadge({
  source,
  state = "ready",
  className,
}: StatefulIndicatorProps & { readonly source: string }) {
  if (state === "loading") {
    return (
      <span
        aria-label="Loading source"
        className="dora-skeleton inline-block h-6 w-16 rounded-full"
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--line)] bg-white/70 px-2.5 text-[10px] font-bold text-[var(--ink-muted)]",
        state === "error" && "border-[var(--danger-line)] text-[var(--danger)]",
        className,
      )}
    >
      <Database aria-hidden="true" size={11} />
      {state === "empty"
        ? "No source"
        : state === "error"
          ? "Source error"
          : source}
    </span>
  );
}

const freshnessStyles: Record<FreshnessStatus, string> = {
  fresh: "bg-[var(--teal-soft)] text-[var(--teal)]",
  delayed: "bg-[var(--amber-soft)] text-[var(--amber)]",
  stale: "bg-[var(--danger-soft)] text-[var(--danger)]",
  unknown: "bg-[var(--surface-subtle)] text-[var(--ink-muted)]",
};

export function FreshnessIndicator({
  status,
  label,
  state = "ready",
  className,
}: StatefulIndicatorProps & {
  readonly status: FreshnessStatus;
  readonly label?: string;
}) {
  if (state === "loading") {
    return (
      <span
        aria-label="Loading freshness"
        className="dora-skeleton inline-block h-6 w-20 rounded-full"
      />
    );
  }

  const effectiveStatus = state === "ready" ? status : "unknown";
  const Icon =
    effectiveStatus === "fresh"
      ? Radio
      : effectiveStatus === "delayed"
        ? Clock3
        : effectiveStatus === "stale"
          ? AlertCircle
          : CheckCircle2;

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold capitalize",
        freshnessStyles[effectiveStatus],
        className,
      )}
    >
      <Icon aria-hidden="true" size={11} />
      {label ?? effectiveStatus}
    </span>
  );
}
