import type {
  EvidenceReference,
  FreshnessStatus,
  IntelligenceDomain,
  IntelligenceMetric,
  IntelligenceRequest,
  IntelligenceResult,
  IntelligenceSignal,
} from "@dora/shared";

export interface IntelligenceContext {
  readonly generatedAt: string;
  readonly freshness: FreshnessStatus;
  readonly metrics: readonly IntelligenceMetric[];
  readonly signals: readonly IntelligenceSignal[];
  readonly evidence: readonly EvidenceReference[];
  readonly limitations?: readonly string[];
}

export interface IntelligenceService {
  readonly domain: IntelligenceDomain;
  analyse(
    request: IntelligenceRequest,
    context: IntelligenceContext,
  ): Promise<IntelligenceResult>;
}

export abstract class EvidenceBackedIntelligenceService implements IntelligenceService {
  abstract readonly domain: IntelligenceDomain;

  async analyse(
    request: IntelligenceRequest,
    context: IntelligenceContext,
  ): Promise<IntelligenceResult> {
    if (request.domain !== this.domain) {
      throw new Error(
        `Expected ${this.domain} request, received ${request.domain}.`,
      );
    }

    const evidenceConfidence = Math.min(context.evidence.length / 3, 1);
    const freshnessConfidence = context.freshness === "fresh" ? 1 : 0.65;

    return {
      domain: this.domain,
      generatedAt: context.generatedAt,
      freshness: context.freshness,
      metrics: context.metrics,
      signals: context.signals,
      evidence: context.evidence,
      confidence: Number((evidenceConfidence * freshnessConfidence).toFixed(2)),
      limitations: context.limitations ?? [],
      suggestedActions: this.suggestActions(context.signals),
    };
  }

  protected abstract suggestActions(
    signals: readonly IntelligenceSignal[],
  ): readonly string[];
}
