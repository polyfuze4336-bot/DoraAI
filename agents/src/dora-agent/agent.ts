import type {
  AgentCitation,
  DoraAgentAnswer,
  DoraAgentEvidence,
  DoraAgentQuery,
  DoraAgentStreamEvent,
  DoraAgentSynthesizer,
  DoraAgentTools,
} from "./contracts";
import { logStructured } from "@dora/observability";

export class DoraIntelligenceAgent {
  constructor(
    private readonly tools: DoraAgentTools,
    private readonly synthesizer?: DoraAgentSynthesizer,
  ) {}

  async answer(query: DoraAgentQuery): Promise<DoraAgentAnswer> {
    if (!query.question.trim()) throw new Error("A DORA question is required.");
    const [observed, forecasts, risks, manufacturing, research] =
      await Promise.all([
        this.tools.getObservedData(query),
        this.tools.getForecasts(query),
        this.tools.getRisks(query),
        this.tools.getManufacturing(query),
        this.tools.searchResearch(query),
      ]);
    const scenarioChange = percentageChange(query.question);
    const scenario =
      scenarioChange !== null && this.tools.runScenario
        ? await this.tools.runScenario(query, scenarioChange)
        : undefined;
    const citationIds = [
      ...observed.map((item) => item.citationId),
      ...risks.flatMap((item) => item.citationIds),
      ...research.map((item) => item.id),
    ];
    const citations = await this.tools.getCitations([...new Set(citationIds)]);
    const evidence: DoraAgentEvidence = {
      observed,
      forecasts,
      risks,
      manufacturing,
      research,
      scenario,
      citations,
    };
    const content = this.synthesizer
      ? await this.synthesizer.synthesize(query, evidence)
      : deterministicSynthesis(query, evidence);
    const answer: DoraAgentAnswer = {
      answerId: crypto.randomUUID(),
      question: query.question,
      generatedAt: new Date().toISOString(),
      mode: this.synthesizer ? "foundry" : "deterministic",
      ...content,
      citations: retainUsedCitations(content.citations, citations),
    };
    logStructured({
      event: "analysis.generated",
      correlationId: query.correlationId ?? answer.answerId,
      timestamp: answer.generatedAt,
      success: true,
      attributes: {
        answerId: answer.answerId,
        mode: answer.mode,
        commodityCount: query.commodityIds.length,
        citationCount: answer.citations.length,
      },
    });
    return answer;
  }

  async *stream(query: DoraAgentQuery): AsyncGenerator<DoraAgentStreamEvent> {
    try {
      yield { type: "status", message: "Retrieving DORA evidence" };
      const answer = await this.answer(query);
      for (const text of streamChunks(answer.summary)) {
        yield { type: "delta", text };
      }
      yield { type: "answer", answer };
    } catch (error) {
      yield {
        type: "error",
        message:
          error instanceof Error ? error.message : "DORA analysis failed.",
      };
    }
  }
}

function streamChunks(value: string): readonly string[] {
  const words = value.split(/(\s+)/).filter(Boolean);
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += 8) {
    chunks.push(words.slice(index, index + 8).join(""));
  }
  return chunks;
}

function deterministicSynthesis(
  query: DoraAgentQuery,
  evidence: DoraAgentEvidence,
): Omit<DoraAgentAnswer, "answerId" | "question" | "generatedAt" | "mode"> {
  const topRisks = [...evidence.risks]
    .sort(
      (left, right) =>
        right.probability * right.impact * right.velocity * right.confidence -
        left.probability * left.impact * left.velocity * left.confidence,
    )
    .slice(0, 3);
  const observedData = evidence.observed
    .slice(0, 6)
    .map((item) => `${item.label}: ${item.value} [${item.citationId}]`);
  const forecast = evidence.forecasts
    .slice(0, 4)
    .map(
      (item) =>
        `${item.commodityId} ${item.horizonDays}-day: ${item.forecast.toFixed(2)} (${item.lowerBound.toFixed(2)}-${item.upperBound.toFixed(2)}), ${Math.round(item.confidence * 100)}% model confidence, ${item.model}.`,
    );
  const scenarioEffects = evidence.scenario?.calculatedEffects ?? [];
  const inference = [
    ...evidence.observed
      .filter((item) => item.direction && item.direction !== "flat")
      .slice(0, 3)
      .map(
        (item) =>
          `${item.label} is moving ${item.direction}; this is an association, not a causal conclusion.`,
      ),
    ...topRisks.map(
      (risk) =>
        `${risk.title} ranks materially under deterministic risk scoring.`,
    ),
  ];
  const recommendation = [
    ...(topRisks.length
      ? [
          "Review the highest-ranked risks and validate their supporting signals.",
        ]
      : ["Maintain monitoring; no scored risk currently requires escalation."]),
    ...(evidence.scenario
      ? ["Use the scenario as a sensitivity, not a point prediction."]
      : []),
  ];
  const citations = evidence.citations.slice(0, 8);
  const conclusion = observedData.length
    ? `DORA found ${observedData.length} observed indicators, ${forecast.length} forecast horizons, and ${topRisks.length} leading risks relevant to the question.`
    : "DORA has no observed data supporting a market conclusion for this question.";
  return {
    summary: conclusion,
    sections: {
      observedData,
      inference,
      forecast: [...forecast, ...scenarioEffects],
      recommendation,
    },
    principalDrivers: inference.slice(0, 3),
    riskFactors: topRisks.map((risk) => risk.title),
    invalidationConditions: [
      "New source data reverses the observed directional signals.",
      "Forecast error exceeds its historical backtest range.",
      "The proposed drivers persist while the forecast direction reverses.",
    ],
    reasoningSummary: {
      observedEvidence: observedData,
      relevantDrivers: inference.slice(0, 3),
      conflictingIndicators: evidence.observed
        .filter((item) => item.direction === "mixed")
        .map((item) => item.label),
      conclusion,
      confidence: confidence(evidence),
      uncertainties: [
        "Tool evidence may be incomplete or stale.",
        "Forecast ranges do not include every possible exogenous shock.",
      ],
    },
    citations,
    inlineChart: evidence.forecasts.map((item) => ({
      label: `${item.horizonDays}d`,
      value: item.forecast,
      lower: item.lowerBound,
      upper: item.upperBound,
    })),
    followUpQuestions: [
      "Which signals contradict this outlook?",
      "What changed since the previous period?",
      "What scenario would most challenge this conclusion?",
    ],
    relatedAnalysis: evidence.research.slice(0, 3).map((item) => item.title),
  };
}

function percentageChange(question: string): number | null {
  const match = question.match(
    /(?:rises?|falls?|changes?|moves?)\s+(?:another\s+)?(-?\d+(?:\.\d+)?)\s*%/i,
  );
  if (!match?.[1]) return null;
  const magnitude = Number(match[1]);
  if (!Number.isFinite(magnitude)) return null;
  return /fall/i.test(match[0]) ? -Math.abs(magnitude) : magnitude;
}

function confidence(evidence: DoraAgentEvidence): number {
  const dataFactor = Math.min(
    (evidence.observed.length + evidence.research.length) / 8,
    1,
  );
  const forecastFactor = evidence.forecasts.length
    ? evidence.forecasts.reduce((sum, item) => sum + item.confidence, 0) /
      evidence.forecasts.length
    : 0.4;
  return Number((dataFactor * 0.6 + forecastFactor * 0.4).toFixed(2));
}

function retainUsedCitations(
  requested: readonly AgentCitation[],
  available: readonly AgentCitation[],
): readonly AgentCitation[] {
  const availableById = new Map(available.map((item) => [item.id, item]));
  return requested.flatMap((item) => availableById.get(item.id) ?? []);
}
