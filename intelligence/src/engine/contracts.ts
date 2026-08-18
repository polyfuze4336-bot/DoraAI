import type { ForecastEngine, ForecastResult } from "@dora/forecasting";
import type { DoraSignal } from "@dora/shared";
import type { SourceQualityAssessment } from "../source-quality";

export const intelligenceEvidenceClasses = [
  "FACT",
  "CALCULATION",
  "MODEL_FORECAST",
  "AI_INTERPRETATION",
] as const;

export type IntelligenceEvidenceClass =
  (typeof intelligenceEvidenceClasses)[number];

export interface ClassifiedArtifact<T> {
  readonly classification: IntelligenceEvidenceClass;
  readonly method: string;
  readonly data: T;
  readonly evidenceSignalIds: readonly string[];
}

export interface SignalFreshnessScore {
  readonly signalId: string;
  readonly ageMinutes: number | null;
  readonly score: number;
  readonly status: "fresh" | "delayed" | "stale" | "unknown";
}

export interface SignalAnomaly {
  readonly signalId: string;
  readonly commodityId: string | null;
  readonly zScore: number;
  readonly anomalous: boolean;
}

export interface TrendCalculation {
  readonly seriesId: string;
  readonly direction: "UP" | "DOWN" | "FLAT";
  readonly slope: number;
  readonly strength: number;
  readonly observations: number;
}

export interface CorrelationCalculation {
  readonly leftSeriesId: string;
  readonly rightSeriesId: string;
  readonly coefficient: number;
  readonly observations: number;
}

export interface PotentialCausalDriver {
  readonly driverSignalId: string;
  readonly targetSeriesId: string;
  readonly temporalLeadHours: number;
  readonly relevance: number;
  readonly rationale: string;
  readonly caveat: string;
}

export interface ResearchEvidence {
  readonly documentId: string;
  readonly chunkId: string;
  readonly title: string;
  readonly excerpt: string;
  readonly citationLabel: string;
}

export interface IntelligenceHypothesis {
  readonly statement: string;
  readonly confidence: number;
  readonly supportingSignalIds: readonly string[];
  readonly supportingDocumentIds: readonly string[];
  readonly falsificationCriteria: readonly string[];
}

export interface ForecastContext {
  readonly seriesId: string;
  readonly engine: string;
  readonly direction: "UP" | "DOWN" | "FLAT";
  readonly intervalWidthChange: number;
  readonly limitations: readonly string[];
}

export interface ManagementInsight {
  readonly headline: string;
  readonly summary: string;
  readonly recommendations: readonly string[];
  readonly scenarioInterpretations: readonly string[];
  readonly citations: readonly string[];
}

export interface IntelligenceInterpretationInput {
  readonly asOf: string;
  readonly facts: readonly DoraSignal[];
  readonly freshness: readonly SignalFreshnessScore[];
  readonly anomalies: readonly SignalAnomaly[];
  readonly trends: readonly TrendCalculation[];
  readonly correlations: readonly CorrelationCalculation[];
  readonly potentialDrivers: readonly PotentialCausalDriver[];
  readonly research: readonly ResearchEvidence[];
  readonly forecasts: readonly ForecastResult[];
}

export interface IntelligenceInterpretation {
  readonly hypotheses: readonly IntelligenceHypothesis[];
  readonly managementInsight: ManagementInsight;
}

export interface IntelligenceInterpreter {
  readonly id: string;
  interpret(
    input: IntelligenceInterpretationInput,
  ): Promise<IntelligenceInterpretation>;
}

export interface SupportingResearchRetriever {
  retrieve(
    query: string,
    options: {
      readonly commodityIds: readonly string[];
      readonly asOf: string;
      readonly top: number;
    },
  ): Promise<readonly ResearchEvidence[]>;
}

export interface IntelligenceEngineRequest {
  readonly signals: readonly DoraSignal[];
  readonly asOf: string;
  readonly forecastHorizon?: number;
  readonly forecastIntervalDays?: number;
}

export interface IntelligenceEngineResult {
  readonly generatedAt: string;
  readonly stages: readonly {
    readonly name:
      | "collect"
      | "validate"
      | "normalize"
      | "score-freshness"
      | "detect-anomalies"
      | "calculate-trend"
      | "detect-correlation"
      | "identify-potential-causal-drivers"
      | "retrieve-supporting-research"
      | "generate-hypotheses"
      | "generate-forecast-context"
      | "generate-management-insight";
    readonly status: "completed" | "skipped";
    readonly itemCount: number;
  }[];
  readonly facts: ClassifiedArtifact<readonly DoraSignal[]>;
  readonly freshness: ClassifiedArtifact<readonly SignalFreshnessScore[]>;
  readonly anomalies: ClassifiedArtifact<readonly SignalAnomaly[]>;
  readonly trends: ClassifiedArtifact<readonly TrendCalculation[]>;
  readonly correlations: ClassifiedArtifact<readonly CorrelationCalculation[]>;
  readonly potentialDrivers: ClassifiedArtifact<
    readonly PotentialCausalDriver[]
  >;
  readonly sourceQuality: ClassifiedArtifact<
    readonly SourceQualityAssessment[]
  >;
  readonly research: ClassifiedArtifact<readonly ResearchEvidence[]>;
  readonly forecasts: readonly ClassifiedArtifact<ForecastResult>[];
  readonly forecastContext: ClassifiedArtifact<readonly ForecastContext[]>;
  readonly hypotheses: ClassifiedArtifact<readonly IntelligenceHypothesis[]>;
  readonly managementInsight: ClassifiedArtifact<ManagementInsight>;
  readonly aiInterpretation?: ClassifiedArtifact<IntelligenceInterpretation>;
  readonly limitations: readonly string[];
}

export interface IntelligenceEngineDependencies {
  readonly forecastEngine: ForecastEngine;
  readonly researchRetriever?: SupportingResearchRetriever;
  readonly interpreter?: IntelligenceInterpreter;
}
