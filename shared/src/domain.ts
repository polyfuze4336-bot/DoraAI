export const intelligenceDomains = [
  "commodity-price",
  "news-updates",
  "emerging-risk",
  "market-intelligence",
  "manufacturing-status",
] as const;

export type IntelligenceDomain = (typeof intelligenceDomains)[number];
export type FreshnessStatus = "fresh" | "delayed" | "stale" | "unknown";

export interface DataProvenance {
  readonly providerId: string;
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly sourceTimestamp: string;
  readonly fetchedAt: string;
  readonly ingestedAt: string;
  readonly correlationId: string;
  readonly license: string;
  readonly termsUrl: string;
  readonly rawChecksum?: string;
}

export interface CommodityObservation {
  readonly providerId: string;
  readonly externalId: string;
  readonly commodityId: string;
  readonly symbol: string;
  readonly name: string;
  readonly observedAt: string;
  readonly publishedAt?: string;
  readonly retrievedAt: string;
  readonly price: number;
  readonly currency: string;
  readonly unit: string;
  readonly geography?: string;
  readonly provenance: DataProvenance;
}

export interface NewsItem {
  readonly providerId: string;
  readonly externalId: string;
  readonly headline: string;
  readonly summary?: string;
  readonly publishedAt: string;
  readonly retrievedAt: string;
  readonly sourceUrl: string;
  readonly commodityIds: readonly string[];
  readonly provenance: DataProvenance;
}

export interface MarketIntelligenceRecord {
  readonly providerId: string;
  readonly externalId: string;
  readonly title: string;
  readonly body: string;
  readonly effectiveAt: string;
  readonly retrievedAt: string;
  readonly commodityIds: readonly string[];
  readonly provenance: DataProvenance;
}

export interface ManufacturingStatusRecord {
  readonly providerId: string;
  readonly externalId: string;
  readonly siteId: string;
  readonly observedAt: string;
  readonly retrievedAt: string;
  readonly status: "normal" | "constrained" | "disrupted" | "unknown";
  readonly commodityIds: readonly string[];
  readonly details?: string;
  readonly provenance: DataProvenance;
}

export interface EnterpriseDocument {
  readonly providerId: string;
  readonly externalId: string;
  readonly title: string;
  readonly body: string;
  readonly classification: string;
  readonly effectiveAt: string;
  readonly retrievedAt: string;
  readonly sourceUri?: string;
  readonly provenance: DataProvenance;
}

export interface EvidenceReference {
  readonly id: string;
  readonly sourceType: "observation" | "document" | "signal" | "forecast";
  readonly sourceId: string;
  readonly observedAt: string;
  readonly label: string;
}

export interface IntelligenceRequest {
  readonly domain: IntelligenceDomain;
  readonly commodityIds: readonly string[];
  readonly geographyIds: readonly string[];
  readonly asOf: string;
  readonly horizonDays: number;
  readonly scenarioId?: string;
}

export interface IntelligenceMetric {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
}

export interface IntelligenceSignal {
  readonly id: string;
  readonly type: string;
  readonly severity: "info" | "low" | "medium" | "high" | "critical";
  readonly headline: string;
  readonly observedAt: string;
}

export interface IntelligenceResult {
  readonly domain: IntelligenceDomain;
  readonly generatedAt: string;
  readonly freshness: FreshnessStatus;
  readonly metrics: readonly IntelligenceMetric[];
  readonly signals: readonly IntelligenceSignal[];
  readonly evidence: readonly EvidenceReference[];
  readonly confidence: number;
  readonly limitations: readonly string[];
  readonly suggestedActions: readonly string[];
}
