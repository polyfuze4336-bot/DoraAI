import type { ForecastResult, TimeSeriesPoint } from "@dora/forecasting";
import { doraSignalSchema, type DoraSignal } from "@dora/shared";

import type {
  ClassifiedArtifact,
  ForecastContext,
  IntelligenceEngineDependencies,
  IntelligenceEngineRequest,
  IntelligenceEngineResult,
  IntelligenceHypothesis,
  ManagementInsight,
  PotentialCausalDriver,
  ResearchEvidence,
} from "./contracts";
import {
  calculateCorrelations,
  calculateTrends,
  detectAnomalies,
  groupNumericSeries,
  scoreFreshness,
} from "./statistics";
import { assessSourceQuality } from "../source-quality";

export class DoraIntelligenceEngine {
  constructor(private readonly dependencies: IntelligenceEngineDependencies) {}

  async run(
    request: IntelligenceEngineRequest,
  ): Promise<IntelligenceEngineResult> {
    const collected = collectSignals(request.signals, request.asOf);
    const validated = validateSignals(collected);
    const normalized = normalizeSignals(validated);
    const freshness = scoreFreshness(normalized, request.asOf);
    const anomalies = detectAnomalies(normalized);
    const trends = calculateTrends(normalized);
    const correlations = calculateCorrelations(normalized);
    const sourceQuality = assessSignalSources(normalized, request.asOf);
    const qualityBySource = new Map(
      sourceQuality.map((item) => [item.sourceId, item.qualityScore]),
    );
    const potentialDrivers = identifyPotentialDrivers(normalized, trends).map(
      (driver) => {
        const signal = normalized.find(
          (item) => item.signalId === driver.driverSignalId,
        );
        return {
          ...driver,
          relevance: round(
            driver.relevance *
              (qualityBySource.get(signal?.provenance.providerId ?? "") ?? 0.5),
          ),
        };
      },
    );
    const research = await this.retrieveResearch(
      normalized,
      trends,
      potentialDrivers,
      request.asOf,
    );
    const forecasts = await this.generateForecasts(normalized, request);
    const forecastContext = forecasts.map(toForecastContext);
    const interpretationInput = {
      asOf: request.asOf,
      facts: normalized,
      freshness,
      anomalies,
      trends,
      correlations,
      potentialDrivers,
      research,
      forecasts,
    };
    const aiInterpretation = this.dependencies.interpreter
      ? await this.dependencies.interpreter.interpret(interpretationInput)
      : undefined;
    const hypotheses =
      aiInterpretation?.hypotheses ??
      generateDeterministicHypotheses(potentialDrivers, research);
    const managementInsight =
      aiInterpretation?.managementInsight ??
      generateDeterministicManagementInsight(
        freshness,
        anomalies,
        trends,
        potentialDrivers,
        forecastContext,
        research,
      );
    const signalIds = normalized.map((signal) => signal.signalId);
    const interpretationClass = aiInterpretation
      ? "AI_INTERPRETATION"
      : "CALCULATION";
    const stages = [
      stage("collect", collected.length),
      stage("validate", validated.length),
      stage("normalize", normalized.length),
      stage("score-freshness", freshness.length),
      stage("detect-anomalies", anomalies.length),
      stage("calculate-trend", trends.length),
      stage("detect-correlation", correlations.length),
      stage("identify-potential-causal-drivers", potentialDrivers.length),
      stage(
        "retrieve-supporting-research",
        research.length,
        Boolean(this.dependencies.researchRetriever),
      ),
      stage("generate-hypotheses", hypotheses.length),
      stage("generate-forecast-context", forecastContext.length),
      stage("generate-management-insight", managementInsight ? 1 : 0),
    ] as IntelligenceEngineResult["stages"];

    return {
      generatedAt: new Date().toISOString(),
      stages,
      facts: artifact(
        "FACT",
        "validated-canonical-signals",
        normalized,
        signalIds,
      ),
      freshness: artifact(
        "CALCULATION",
        "exponential-age-decay-v1",
        freshness,
        signalIds,
      ),
      anomalies: artifact(
        "CALCULATION",
        "within-series-z-score-v1",
        anomalies,
        anomalies.map((item) => item.signalId),
      ),
      trends: artifact(
        "CALCULATION",
        "ordinary-least-squares-slope-v1",
        trends,
        signalIds,
      ),
      correlations: artifact(
        "CALCULATION",
        "timestamp-aligned-pearson-v1",
        correlations,
        signalIds,
      ),
      potentialDrivers: artifact(
        "CALCULATION",
        "temporal-precedence-relevance-screen-v1",
        potentialDrivers,
        potentialDrivers.map((driver) => driver.driverSignalId),
      ),
      sourceQuality: artifact(
        "CALCULATION",
        "weighted-source-quality-v1",
        sourceQuality,
        signalIds,
      ),
      research: artifact("FACT", "knowledge-hybrid-retrieval", research, []),
      forecasts: forecasts.map((forecast) =>
        artifact(
          "MODEL_FORECAST",
          forecast.engine,
          forecast,
          signalIdsForSeries(normalized, forecast.seriesId),
        ),
      ),
      forecastContext: artifact(
        "CALCULATION",
        "forecast-direction-and-interval-context-v1",
        forecastContext,
        signalIds,
      ),
      hypotheses: artifact(
        interpretationClass,
        aiInterpretation
          ? this.dependencies.interpreter!.id
          : "temporal-association-hypothesis-v1",
        hypotheses,
        hypotheses.flatMap((hypothesis) => hypothesis.supportingSignalIds),
      ),
      managementInsight: artifact(
        interpretationClass,
        aiInterpretation
          ? this.dependencies.interpreter!.id
          : "deterministic-management-rules-v1",
        managementInsight,
        signalIds,
      ),
      aiInterpretation: aiInterpretation
        ? artifact(
            "AI_INTERPRETATION",
            this.dependencies.interpreter!.id,
            aiInterpretation,
            signalIds,
          )
        : undefined,
      limitations: [
        "Correlation and temporal precedence identify associations, not proven causation.",
        "Forecast values are produced only by the configured deterministic/statistical/ML forecast engine.",
        ...(aiInterpretation
          ? []
          : [
              "No LLM interpreter is configured; hypotheses and management language use deterministic rules.",
            ]),
        ...(this.dependencies.researchRetriever
          ? []
          : ["Supporting research retrieval is not configured."]),
      ],
    };
  }

  private async retrieveResearch(
    signals: readonly DoraSignal[],
    trends: ReturnType<typeof calculateTrends>,
    drivers: readonly PotentialCausalDriver[],
    asOf: string,
  ): Promise<readonly ResearchEvidence[]> {
    if (!this.dependencies.researchRetriever) return [];
    const commodityIds = [
      ...new Set(signals.flatMap((signal) => signal.commodity?.id ?? [])),
    ];
    const query = [
      ...trends.map(
        (trend) => `${trend.seriesId} ${trend.direction.toLowerCase()} trend`,
      ),
      ...drivers.map((driver) => driver.rationale),
    ].join("; ");
    return this.dependencies.researchRetriever.retrieve(
      query || "current commodity market drivers",
      { commodityIds, asOf, top: 8 },
    );
  }

  private async generateForecasts(
    signals: readonly DoraSignal[],
    request: IntelligenceEngineRequest,
  ): Promise<readonly ForecastResult[]> {
    const series = groupNumericSeries(signals).filter(
      ([seriesId, values]) =>
        seriesId.includes(":PRICE:") && values.length >= 2,
    );
    return Promise.all(
      series.map(([seriesId, values]) =>
        this.dependencies.forecastEngine.forecast({
          seriesId,
          observations: values.map(({ signal, value }): TimeSeriesPoint => ({
            observedAt: signal.timestamp,
            value,
          })),
          horizon: request.forecastHorizon ?? 6,
          intervalDays: request.forecastIntervalDays ?? 30,
        }),
      ),
    );
  }
}

function assessSignalSources(
  signals: readonly DoraSignal[],
  assessedAt: string,
) {
  const grouped = new Map<string, DoraSignal[]>();
  for (const signal of signals) {
    const sourceId = signal.provenance.providerId;
    grouped.set(sourceId, [...(grouped.get(sourceId) ?? []), signal]);
  }
  const sourceCount = grouped.size;
  return [...grouped.entries()].map(([sourceId, items]) =>
    assessSourceQuality(
      {
        sourceId,
        configuredReliability: average(
          items.map((item) =>
            typeof item.metadata.sourceReliability === "number"
              ? item.metadata.sourceReliability
              : 0.7,
          ),
        ),
        freshness: average(
          items.map((item) =>
            item.freshness.status === "fresh"
              ? 1
              : item.freshness.status === "delayed"
                ? 0.65
                : item.freshness.status === "stale"
                  ? 0.25
                  : 0.4,
          ),
        ),
        completeness:
          items.filter(
            (item) =>
              item.headline && item.sourceUrl && item.provenance.sourceId,
          ).length / items.length,
        corroboration: Math.min(sourceCount / 3, 1),
        historicalSignalQuality: average(
          items.map((item) =>
            typeof item.metadata.historicalSignalQuality === "number"
              ? item.metadata.historicalSignalQuality
              : 0.65,
          ),
        ),
      },
      assessedAt,
    ),
  );
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function collectSignals(
  signals: readonly DoraSignal[],
  asOf: string,
): readonly DoraSignal[] {
  const cutoff = Date.parse(asOf);
  if (!Number.isFinite(cutoff))
    throw new Error("Intelligence asOf must be an ISO timestamp.");
  return signals.filter((signal) => Date.parse(signal.timestamp) <= cutoff);
}

function validateSignals(
  signals: readonly DoraSignal[],
): readonly DoraSignal[] {
  return signals.map((signal, index) => {
    const result = doraSignalSchema.safeParse(signal);
    if (!result.success) {
      throw new Error(
        `Signal ${index} failed canonical validation: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
      );
    }
    return result.data;
  });
}

function normalizeSignals(
  signals: readonly DoraSignal[],
): readonly DoraSignal[] {
  return [
    ...new Map(signals.map((signal) => [signal.signalId, signal])).values(),
  ].sort(
    (left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp),
  );
}

function identifyPotentialDrivers(
  signals: readonly DoraSignal[],
  trends: ReturnType<typeof calculateTrends>,
): readonly PotentialCausalDriver[] {
  const priceTrends = trends.filter((trend) =>
    trend.seriesId.includes(":PRICE:"),
  );
  return priceTrends.flatMap((trend) => {
    const commodityId = trend.seriesId.split(":")[0];
    const targets = signals.filter(
      (signal) =>
        signal.commodity?.id === commodityId && signal.signalType === "PRICE",
    );
    const targetAt = Math.max(
      ...targets.map((signal) => Date.parse(signal.timestamp)),
    );
    return signals
      .filter(
        (signal) =>
          signal.commodity?.id === commodityId &&
          signal.signalType !== "PRICE" &&
          signal.relevance >= 0.5 &&
          Date.parse(signal.timestamp) < targetAt,
      )
      .map((signal) => ({
        driverSignalId: signal.signalId,
        targetSeriesId: trend.seriesId,
        temporalLeadHours: round(
          (targetAt - Date.parse(signal.timestamp)) / 3_600_000,
        ),
        relevance: signal.relevance,
        rationale: `${signal.headline} preceded the ${trend.direction.toLowerCase()} ${trend.seriesId} trend.`,
        caveat:
          "Temporal precedence and relevance support a hypothesis only; they do not establish causation.",
      }));
  });
}

function toForecastContext(forecast: ForecastResult): ForecastContext {
  const first = forecast.points[0];
  const last = forecast.points.at(-1);
  const change = first && last ? last.value - first.value : 0;
  const firstWidth = first ? first.upper - first.lower : 0;
  const lastWidth = last ? last.upper - last.lower : 0;
  return {
    seriesId: forecast.seriesId,
    engine: forecast.engine,
    direction: Math.abs(change) < 0.0001 ? "FLAT" : change > 0 ? "UP" : "DOWN",
    intervalWidthChange: round(lastWidth - firstWidth),
    limitations: forecast.limitations,
  };
}

function generateDeterministicHypotheses(
  drivers: readonly PotentialCausalDriver[],
  research: readonly ResearchEvidence[],
): readonly IntelligenceHypothesis[] {
  return drivers.slice(0, 5).map((driver) => ({
    statement: `${driver.rationale} This is a testable association, not a causal conclusion.`,
    confidence: round(Math.min(driver.relevance * 0.65, 0.65)),
    supportingSignalIds: [driver.driverSignalId],
    supportingDocumentIds: research.slice(0, 2).map((item) => item.documentId),
    falsificationCriteria: [
      "The target trend reverses while the proposed driver remains active.",
      "The relationship disappears when tested against a longer historical window.",
    ],
  }));
}

function generateDeterministicManagementInsight(
  freshness: IntelligenceEngineResult["freshness"]["data"],
  anomalies: IntelligenceEngineResult["anomalies"]["data"],
  trends: IntelligenceEngineResult["trends"]["data"],
  drivers: readonly PotentialCausalDriver[],
  forecasts: readonly ForecastContext[],
  research: readonly ResearchEvidence[],
): ManagementInsight {
  const anomalousCount = anomalies.filter((item) => item.anomalous).length;
  const staleCount = freshness.filter((item) => item.status === "stale").length;
  const upward = trends.filter((trend) => trend.direction === "UP").length;
  return {
    headline: anomalousCount
      ? `${anomalousCount} anomalous signal${anomalousCount === 1 ? "" : "s"} require review`
      : "No statistical anomaly requires immediate escalation",
    summary: `${upward} series trend upward; ${drivers.length} potential drivers and ${forecasts.length} model forecast contexts were identified. ${staleCount} stale signals reduce confidence.`,
    recommendations: [
      ...(anomalousCount
        ? ["Validate anomalous observations against source records."]
        : []),
      ...(staleCount
        ? ["Refresh stale source feeds before making commitments."]
        : []),
      ...(drivers.length
        ? [
            "Test potential drivers as hypotheses before treating them as causal.",
          ]
        : []),
    ],
    scenarioInterpretations: forecasts.map(
      (forecast) =>
        `${forecast.seriesId}: ${forecast.direction.toLowerCase()} model direction with interval width change ${forecast.intervalWidthChange}.`,
    ),
    citations: research.map((item) => item.citationLabel),
  };
}

function artifact<T>(
  classification: ClassifiedArtifact<T>["classification"],
  method: string,
  data: T,
  evidenceSignalIds: readonly string[],
): ClassifiedArtifact<T> {
  return { classification, method, data, evidenceSignalIds };
}

function stage(
  name: IntelligenceEngineResult["stages"][number]["name"],
  itemCount: number,
  enabled = true,
): IntelligenceEngineResult["stages"][number] {
  return { name, status: enabled ? "completed" : "skipped", itemCount };
}

function signalIdsForSeries(
  signals: readonly DoraSignal[],
  seriesId: string,
): readonly string[] {
  return (
    groupNumericSeries(signals)
      .find(([id]) => id === seriesId)?.[1]
      .map(({ signal }) => signal.signalId) ?? []
  );
}

function round(value: number): number {
  return Number(value.toFixed(4));
}
