import type { ReasoningSummary } from "../foundry/contracts";

export interface DoraAgentQuery {
  readonly correlationId?: string;
  readonly question: string;
  readonly commodityIds: readonly string[];
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface AgentCitation {
  readonly id: string;
  readonly label: string;
  readonly sourceUrl?: string;
  readonly observedAt: string;
  readonly excerpt?: string;
}

export interface AgentObservedDatum {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly observedAt: string;
  readonly citationId: string;
  readonly direction?: "up" | "down" | "flat" | "mixed";
}

export interface AgentForecastDatum {
  readonly commodityId: string;
  readonly horizonDays: number;
  readonly forecast: number;
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly confidence: number;
  readonly model: string;
  readonly generatedAt: string;
}

export interface AgentRiskDatum {
  readonly id: string;
  readonly title: string;
  readonly probability: number;
  readonly impact: number;
  readonly velocity: number;
  readonly confidence: number;
  readonly citationIds: readonly string[];
}

export interface AgentManufacturingDatum {
  readonly id: string;
  readonly site: string;
  readonly region: string;
  readonly utilization: number;
  readonly demandIndicator: number;
  readonly status: string;
  readonly timestamp: string;
  readonly dataOrigin: "internal" | "seeded-demo";
}

export interface AgentResearchDatum {
  readonly id: string;
  readonly title: string;
  readonly excerpt: string;
  readonly observedAt: string;
  readonly sourceUrl?: string;
}

export interface AgentScenarioResult {
  readonly name: string;
  readonly assumptions: readonly string[];
  readonly calculatedEffects: readonly string[];
  readonly limitations: readonly string[];
}

export interface DoraAgentEvidence {
  readonly observed: readonly AgentObservedDatum[];
  readonly forecasts: readonly AgentForecastDatum[];
  readonly risks: readonly AgentRiskDatum[];
  readonly manufacturing: readonly AgentManufacturingDatum[];
  readonly research: readonly AgentResearchDatum[];
  readonly scenario?: AgentScenarioResult;
  readonly citations: readonly AgentCitation[];
}

export interface DoraAgentTools {
  getObservedData(
    query: DoraAgentQuery,
  ): Promise<readonly AgentObservedDatum[]>;
  getForecasts(query: DoraAgentQuery): Promise<readonly AgentForecastDatum[]>;
  getRisks(query: DoraAgentQuery): Promise<readonly AgentRiskDatum[]>;
  getManufacturing(
    query: DoraAgentQuery,
  ): Promise<readonly AgentManufacturingDatum[]>;
  searchResearch(query: DoraAgentQuery): Promise<readonly AgentResearchDatum[]>;
  getCitations(ids: readonly string[]): Promise<readonly AgentCitation[]>;
  runScenario?(
    query: DoraAgentQuery,
    percentageChange: number,
  ): Promise<AgentScenarioResult>;
}

export interface DoraAgentSections {
  readonly observedData: readonly string[];
  readonly inference: readonly string[];
  readonly forecast: readonly string[];
  readonly recommendation: readonly string[];
}

export interface DoraAgentAnswer {
  readonly answerId: string;
  readonly question: string;
  readonly summary: string;
  readonly sections: DoraAgentSections;
  readonly principalDrivers: readonly string[];
  readonly riskFactors: readonly string[];
  readonly invalidationConditions: readonly string[];
  readonly reasoningSummary: ReasoningSummary;
  readonly citations: readonly AgentCitation[];
  readonly inlineChart: readonly {
    readonly label: string;
    readonly value: number;
    readonly lower?: number;
    readonly upper?: number;
  }[];
  readonly followUpQuestions: readonly string[];
  readonly relatedAnalysis: readonly string[];
  readonly generatedAt: string;
  readonly mode: "foundry" | "deterministic";
}

export interface DoraAgentSynthesizer {
  synthesize(
    query: DoraAgentQuery,
    evidence: DoraAgentEvidence,
  ): Promise<
    Omit<DoraAgentAnswer, "answerId" | "question" | "generatedAt" | "mode">
  >;
}

export type DoraAgentStreamEvent =
  | { readonly type: "status"; readonly message: string }
  | { readonly type: "delta"; readonly text: string }
  | { readonly type: "answer"; readonly answer: DoraAgentAnswer }
  | { readonly type: "error"; readonly message: string };
