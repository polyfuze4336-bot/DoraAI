import type {
  CommodityObservation,
  EnterpriseDocument,
  ManufacturingStatusRecord,
  MarketIntelligenceRecord,
  NewsItem,
} from "@dora/shared";

export const providerKinds = [
  "commodity-price",
  "news",
  "market-intelligence",
  "manufacturing",
  "enterprise-document",
] as const;

export type ProviderKind = (typeof providerKinds)[number];

export interface ProviderContext {
  readonly correlationId: string;
  readonly requestedAt: string;
  readonly signal?: AbortSignal;
}

export interface ProviderFetchResult<TRaw> {
  readonly data: TRaw;
  readonly fetchedAt: string;
  readonly sourceVersion?: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface ProviderValidationIssue {
  readonly path: string;
  readonly message: string;
  readonly severity: "warning" | "error";
}

export interface ProviderValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ProviderValidationIssue[];
}

export interface ProviderHealth {
  readonly providerId: string;
  readonly status: "healthy" | "degraded" | "unavailable" | "not-configured";
  readonly checkedAt: string;
  readonly latencyMs?: number;
  readonly message?: string;
  readonly lastSourceTimestamp?: string;
  readonly consecutiveFailures?: number;
}

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

export interface RateLimitPolicy {
  readonly requests: number;
  readonly perMilliseconds: number;
}

export interface ProviderRuntimePolicy {
  readonly timeoutMs: number;
  readonly retry: RetryPolicy;
  readonly rateLimit: RateLimitPolicy;
}

export interface ExternalProvider<TQuery, TRaw, TNormalized> {
  readonly id: string;
  readonly kind: ProviderKind;
  fetch(
    query: TQuery,
    context: ProviderContext,
  ): Promise<ProviderFetchResult<TRaw>>;
  validate(data: TRaw): Promise<ProviderValidationResult>;
  normalize(
    data: TRaw,
    context: ProviderContext,
  ): Promise<readonly TNormalized[]>;
  healthCheck(): Promise<ProviderHealth>;
}

export interface CommodityPriceQuery {
  readonly commodityIds?: readonly string[];
}

export interface NewsQuery {
  readonly commodityIds?: readonly string[];
  readonly publishedAfter?: string;
}

export interface MarketIntelligenceQuery {
  readonly commodityIds?: readonly string[];
  readonly effectiveAfter?: string;
}

export interface ManufacturingQuery {
  readonly siteIds?: readonly string[];
  readonly observedAfter?: string;
}

export interface EnterpriseDocumentQuery {
  readonly classifications?: readonly string[];
  readonly changedAfter?: string;
}

export type CommodityPriceProvider<TRaw = unknown> = ExternalProvider<
  CommodityPriceQuery,
  TRaw,
  CommodityObservation
>;

export type NewsProvider<TRaw = unknown> = ExternalProvider<
  NewsQuery,
  TRaw,
  NewsItem
>;

export type MarketIntelligenceProvider<TRaw = unknown> = ExternalProvider<
  MarketIntelligenceQuery,
  TRaw,
  MarketIntelligenceRecord
>;

export type ManufacturingProvider<TRaw = unknown> = ExternalProvider<
  ManufacturingQuery,
  TRaw,
  ManufacturingStatusRecord
>;

export type EnterpriseDocumentProvider<TRaw = unknown> = ExternalProvider<
  EnterpriseDocumentQuery,
  TRaw,
  EnterpriseDocument
>;
