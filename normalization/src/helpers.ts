import { createHash } from "node:crypto";

import {
  doraSignalSchema,
  type DataProvenance,
  type DoraSignal,
  type RawSignalReference,
  type SignalDirection,
  type SignalFreshness,
  type SignalSentiment,
  type SignalType,
} from "@dora/shared";

import type { SignalNormalizationContext } from "./contracts";

interface SignalBaseInput {
  readonly signalType: SignalType;
  readonly externalId: string;
  readonly source: string;
  readonly commodity: DoraSignal["commodity"];
  readonly region: string | null;
  readonly timestamp: string;
  readonly value: number | string | null;
  readonly unit: string | null;
  readonly direction: SignalDirection;
  readonly magnitude: number | null;
  readonly sentiment: SignalSentiment;
  readonly relevance: number;
  readonly confidence: number;
  readonly headline: string;
  readonly description: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly provenance: DataProvenance;
}

export function createSignal(
  input: SignalBaseInput,
  context: SignalNormalizationContext,
): DoraSignal {
  const rawReference: RawSignalReference = {
    providerId: input.provenance.providerId,
    externalId: input.externalId,
    sourceId: input.provenance.sourceId,
    rawChecksum: input.provenance.rawChecksum,
    rawBatchPath: context.rawBatchPath,
  };
  const signal: DoraSignal = {
    signalId: stableSignalId(
      input.provenance.providerId,
      input.externalId,
      input.signalType,
    ),
    signalType: input.signalType,
    source: input.source,
    provider: context.providerId,
    commodity: input.commodity,
    region: input.region,
    timestamp: input.timestamp,
    ingestedAt: input.provenance.ingestedAt,
    value: input.value,
    unit: input.unit,
    direction: input.direction,
    magnitude: input.magnitude,
    sentiment: input.sentiment,
    relevance: input.relevance,
    confidence: input.confidence,
    freshness: assessFreshness(
      input.timestamp,
      context.normalizedAt,
      context.refreshMinutes,
    ),
    headline: input.headline,
    description: input.description,
    sourceUrl: input.provenance.sourceUrl,
    metadata: input.metadata,
    provenance: input.provenance,
    rawReference,
  };

  return doraSignalSchema.parse(signal);
}

export function movement(
  current: number,
  previous: number | undefined,
): {
  readonly direction: SignalDirection;
  readonly magnitude: number | null;
  readonly percentageChange: number | null;
} {
  if (previous === undefined || previous === 0) {
    return { direction: "UNKNOWN", magnitude: null, percentageChange: null };
  }
  const percentageChange = (current - previous) / Math.abs(previous);
  const direction: SignalDirection =
    Math.abs(percentageChange) < 0.001
      ? "FLAT"
      : percentageChange > 0
        ? "UP"
        : "DOWN";
  return {
    direction,
    magnitude: Math.min(Math.abs(percentageChange), 1),
    percentageChange,
  };
}

export function sentimentFromDirection(
  direction: SignalDirection,
): SignalSentiment {
  if (direction === "UP") return "POSITIVE";
  if (direction === "DOWN") return "NEGATIVE";
  if (direction === "FLAT") return "NEUTRAL";
  return "UNKNOWN";
}

function stableSignalId(
  providerId: string,
  externalId: string,
  signalType: SignalType,
): string {
  const digest = createHash("sha256")
    .update(`${providerId}:${externalId}:${signalType}`)
    .digest("hex")
    .slice(0, 32);
  return `sig_${digest}`;
}

function assessFreshness(
  sourceTimestamp: string,
  assessedAt: string,
  refreshMinutes: number,
): SignalFreshness {
  const sourceTime = Date.parse(sourceTimestamp);
  const assessmentTime = Date.parse(assessedAt);
  if (!Number.isFinite(sourceTime) || !Number.isFinite(assessmentTime)) {
    return {
      status: "unknown",
      ageMinutes: null,
      expectedRefreshMinutes: refreshMinutes,
      assessedAt,
    };
  }

  const ageMinutes = Math.max(0, (assessmentTime - sourceTime) / 60_000);
  return {
    status:
      ageMinutes <= refreshMinutes * 1.5
        ? "fresh"
        : ageMinutes <= refreshMinutes * 3
          ? "delayed"
          : "stale",
    ageMinutes: Number(ageMinutes.toFixed(2)),
    expectedRefreshMinutes: refreshMinutes,
    assessedAt,
  };
}
