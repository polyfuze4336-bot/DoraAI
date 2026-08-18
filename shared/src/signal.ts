import { z } from "zod";

import type { DataProvenance, FreshnessStatus } from "./domain";

export const signalTypes = [
  "PRICE",
  "NEWS",
  "RISK",
  "MARKET_INTELLIGENCE",
  "MANUFACTURING",
  "MACRO",
  "SUPPLY",
  "DEMAND",
  "INVENTORY",
  "GEOPOLITICAL",
  "WEATHER",
  "SHIPPING",
] as const;

export const signalDirections = [
  "UP",
  "DOWN",
  "FLAT",
  "MIXED",
  "UNKNOWN",
] as const;

export const signalSentiments = [
  "POSITIVE",
  "NEGATIVE",
  "NEUTRAL",
  "MIXED",
  "UNKNOWN",
] as const;

export type SignalType = (typeof signalTypes)[number];
export type SignalDirection = (typeof signalDirections)[number];
export type SignalSentiment = (typeof signalSentiments)[number];

export interface SignalCommodity {
  readonly id: string;
  readonly symbol?: string;
  readonly name?: string;
}

export interface SignalFreshness {
  readonly status: FreshnessStatus;
  readonly ageMinutes: number | null;
  readonly expectedRefreshMinutes: number;
  readonly assessedAt: string;
}

export interface RawSignalReference {
  readonly providerId: string;
  readonly externalId: string;
  readonly sourceId: string;
  readonly rawChecksum?: string;
  readonly rawBatchPath?: string;
}

export interface DoraSignal {
  readonly signalId: string;
  readonly signalType: SignalType;
  readonly source: string;
  readonly provider: string;
  readonly commodity: SignalCommodity | null;
  readonly region: string | null;
  readonly timestamp: string;
  readonly ingestedAt: string;
  readonly value: number | string | null;
  readonly unit: string | null;
  readonly direction: SignalDirection;
  readonly magnitude: number | null;
  readonly sentiment: SignalSentiment;
  readonly relevance: number;
  readonly confidence: number;
  readonly freshness: SignalFreshness;
  readonly headline: string;
  readonly description: string;
  readonly sourceUrl: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly provenance: DataProvenance;
  readonly rawReference: RawSignalReference;
}

const dataProvenanceSchema = z.object({
  providerId: z.string().min(1),
  sourceId: z.string().min(1),
  sourceUrl: z.url(),
  sourceTimestamp: z.string().min(1),
  fetchedAt: z.string().min(1),
  ingestedAt: z.string().min(1),
  correlationId: z.string().min(1),
  license: z.string().min(1),
  termsUrl: z.url(),
  rawChecksum: z.string().length(64).optional(),
});

export const doraSignalSchema: z.ZodType<DoraSignal> = z.object({
  signalId: z.string().min(1),
  signalType: z.enum(signalTypes),
  source: z.string().min(1),
  provider: z.string().min(1),
  commodity: z
    .object({
      id: z.string().min(1),
      symbol: z.string().optional(),
      name: z.string().optional(),
    })
    .nullable(),
  region: z.string().nullable(),
  timestamp: z.string().min(1),
  ingestedAt: z.string().min(1),
  value: z.union([z.number(), z.string(), z.null()]),
  unit: z.string().nullable(),
  direction: z.enum(signalDirections),
  magnitude: z.number().min(0).max(1).nullable(),
  sentiment: z.enum(signalSentiments),
  relevance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  freshness: z.object({
    status: z.enum(["fresh", "delayed", "stale", "unknown"]),
    ageMinutes: z.number().min(0).nullable(),
    expectedRefreshMinutes: z.number().int().positive(),
    assessedAt: z.string().min(1),
  }),
  headline: z.string().min(1),
  description: z.string(),
  sourceUrl: z.url(),
  metadata: z.record(z.string(), z.unknown()),
  provenance: dataProvenanceSchema,
  rawReference: z.object({
    providerId: z.string().min(1),
    externalId: z.string().min(1),
    sourceId: z.string().min(1),
    rawChecksum: z.string().length(64).optional(),
    rawBatchPath: z.string().optional(),
  }),
});
