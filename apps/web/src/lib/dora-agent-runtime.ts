import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  DoraIntelligenceAgent,
  FoundryDoraAgentSynthesizer,
  FoundryModelClient,
  JsonLinesAiTelemetrySink,
  StructuredAiTelemetrySink,
  loadFoundryModelConfiguration,
  type AgentCitation,
  type AgentForecastDatum,
  type AgentManufacturingDatum,
  type AgentObservedDatum,
  type AgentResearchDatum,
  type AgentRiskDatum,
  type DoraAgentQuery,
  type DoraAgentTools,
} from "@dora/agents";
import { InterpretableBaselineForecastService } from "@dora/forecasting";
import {
  DeterministicRiskEngine,
  type RiskScoringInput,
} from "@dora/intelligence";
import { getKnowledgeService } from "@dora/knowledge";
import {
  PostgresOperationalStore,
} from "@dora/storage";
import { LocalSqliteManufacturingStore } from "@dora/storage/local-sqlite-store";

import { commandCommodities } from "@/lib/command-centre-data";
import { loadAdminSettings } from "@/lib/admin-settings";

export async function createDoraAgent(): Promise<DoraIntelligenceAgent> {
  const tools = new WebDoraAgentTools();
  const admin = await loadAdminSettings();
  const config = loadFoundryModelConfiguration({
    ...process.env,
    DORA_FAST_MODEL: admin.aiModels.fastDeployment,
    DORA_REASONING_MODEL: admin.aiModels.reasoningDeployment,
    DORA_EMBEDDING_MODEL: admin.aiModels.embeddingDeployment,
  });
  if (!config) return new DoraIntelligenceAgent(tools);
  const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
  const telemetry =
    process.env.NODE_ENV === "production"
      ? new StructuredAiTelemetrySink()
      : new JsonLinesAiTelemetrySink(
          resolve(
            root,
            process.env.DORA_AI_TELEMETRY_PATH ??
              ".dora-data/ai-requests.jsonl",
          ),
        );
  return new DoraIntelligenceAgent(
    tools,
    new FoundryDoraAgentSynthesizer(new FoundryModelClient(config, telemetry)),
  );
}

class WebDoraAgentTools implements DoraAgentTools {
  readonly #citations = new Map<string, AgentCitation>();

  async getObservedData(
    query: DoraAgentQuery,
  ): Promise<readonly AgentObservedDatum[]> {
    const selected = selectCommodities(query.commodityIds);
    return selected.flatMap((commodity) => {
      const observedAt = "2026-08-17T12:00:00.000Z";
      if (!withinDateRange(observedAt, query)) return [];
      const items: AgentObservedDatum[] = [
        {
          id: `${commodity.symbol}-price`,
          label: `${commodity.name} price`,
          value: `${commodity.currency} ${commodity.price.toLocaleString("en")} / ${commodity.unit}`,
          observedAt,
          citationId: `${commodity.symbol}-market-snapshot`,
          direction: commodity.trend,
        },
        {
          id: `${commodity.symbol}-30d-change`,
          label: `${commodity.name} 30-day change`,
          value: `${commodity.change30d >= 0 ? "+" : ""}${commodity.change30d}%`,
          observedAt,
          citationId: `${commodity.symbol}-market-snapshot`,
          direction:
            commodity.change30d > 0
              ? "up"
              : commodity.change30d < 0
                ? "down"
                : "flat",
        },
      ];
      this.#citations.set(`${commodity.symbol}-market-snapshot`, {
        id: `${commodity.symbol}-market-snapshot`,
        label: `${commodity.name} DORA prototype market snapshot`,
        observedAt,
        excerpt: `${commodity.name}: ${commodity.price} ${commodity.currency}/${commodity.unit}; 30-day change ${commodity.change30d}%. Seeded prototype market data.`,
      });
      return items;
    });
  }

  async getForecasts(
    query: DoraAgentQuery,
  ): Promise<readonly AgentForecastDatum[]> {
    const service = new InterpretableBaselineForecastService();
    const selected = selectCommodities(query.commodityIds);
    const results = await Promise.all(
      selected.slice(0, 3).map(async (commodity) => {
        const observations = Array.from({ length: 150 }, (_, index) => ({
          observedAt: new Date(Date.UTC(2026, 2, index + 1)).toISOString(),
          value:
            commodity.price *
            (0.91 + index * 0.00062 + Math.sin(index / 8) * 0.012),
        }));
        return service.forecast({
          seriesId: commodity.symbol,
          observations,
          horizons: [1, 7, 30, 90],
        });
      }),
    );
    return results.flat().map((forecast) => ({
      commodityId: forecast.seriesId,
      horizonDays: forecast.forecastHorizonDays,
      forecast: forecast.forecast,
      lowerBound: forecast.lowerBound,
      upperBound: forecast.upperBound,
      confidence: forecast.confidence,
      model: `${forecast.model} v${forecast.modelVersion}`,
      generatedAt: forecast.generatedAt,
    }));
  }

  async getRisks(query: DoraAgentQuery): Promise<readonly AgentRiskDatum[]> {
    const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
    const inputs = JSON.parse(
      await readFile(resolve(root, "config/demo-risk-inputs.json"), "utf8"),
    ) as RiskScoringInput[];
    const requested = new Set(
      query.commodityIds.map((value) => value.toLowerCase()),
    );
    return new DeterministicRiskEngine()
      .scoreAll(inputs)
      .filter(
        (risk) =>
          withinDateRange(risk.lastUpdated, query) &&
          (!requested.size ||
            [...requested].some(
              (value) =>
                risk.commodity.toLowerCase().includes(value) ||
                risk.title.toLowerCase().includes(value),
            )),
      )
      .map((risk) => {
        for (const item of risk.evidence) {
          this.#citations.set(item.id, {
            id: item.id,
            label: item.label,
            sourceUrl: item.sourceUrl,
            observedAt: risk.lastUpdated,
            excerpt: `${risk.title}: deterministic score ${risk.score}. Seeded demo risk input.`,
          });
        }
        return {
          id: risk.riskId,
          title: risk.title,
          probability: risk.probability,
          impact: risk.impact,
          velocity: risk.velocity,
          confidence: risk.confidence,
          citationIds: risk.evidence.map((item) => item.id),
        };
      });
  }

  async getManufacturing(
    _query: DoraAgentQuery,
  ): Promise<readonly AgentManufacturingDatum[]> {
    const host = process.env.PGHOST;
    const database = process.env.PGDATABASE;
    const user = process.env.PGUSER;
    if (!host || !database || !user) {
      const root =
        process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
      const store = await LocalSqliteManufacturingStore.open(
        resolve(
          root,
          process.env.DORA_LOCAL_DATABASE_PATH ?? ".dora-data/dora-local.db",
        ),
        resolve(root, "config/demo-manufacturing-records.json"),
      );
      try {
        return (await store.listManufacturingStatus({ limit: 100 }))
          .filter((item) => withinDateRange(item.timestamp, _query))
          .map((item) => ({
            id: item.recordId,
            site: item.site,
            region: item.region,
            utilization: item.utilization,
            demandIndicator: item.demandIndicator,
            status: item.status,
            timestamp: item.timestamp,
            dataOrigin: item.dataOrigin,
          }));
      } finally {
        store.close();
      }
    }
    const store = new PostgresOperationalStore({
      host,
      database,
      user,
      port: Number(process.env.PGPORT ?? 5432),
      password: process.env.PGPASSWORD,
      useEntraIdentity: process.env.PG_USE_ENTRA_IDENTITY !== "false",
      ssl: process.env.PGSSL !== "false",
    });
    try {
      return (await store.listManufacturingStatus({ limit: 100 }))
        .filter((item) => withinDateRange(item.timestamp, _query))
        .map((item) => ({
          id: item.recordId,
          site: item.site,
          region: item.region,
          utilization: item.utilization,
          demandIndicator: item.demandIndicator,
          status: item.status,
          timestamp: item.timestamp,
          dataOrigin: item.dataOrigin,
        }));
    } finally {
      await store.close();
    }
  }

  async searchResearch(
    query: DoraAgentQuery,
  ): Promise<readonly AgentResearchDatum[]> {
    try {
      const knowledge = await getKnowledgeService();
      const results = await knowledge.search({ query: query.question, top: 6 });
      return results
        .filter((result) =>
          withinDateRange(result.document.metadata.date, query),
        )
        .map((result) => {
          const item = {
            id: result.chunk.chunkId,
            title: result.document.metadata.title,
            excerpt: result.chunk.content.slice(0, 500),
            observedAt: result.document.metadata.date,
            sourceUrl: result.document.metadata.externalSourceUri,
          };
          this.#citations.set(item.id, {
            id: item.id,
            label: result.chunk.citationLabel,
            sourceUrl: item.sourceUrl,
            observedAt: item.observedAt,
            excerpt: item.excerpt,
          });
          return item;
        });
    } catch {
      return [];
    }
  }

  async getCitations(
    ids: readonly string[],
  ): Promise<readonly AgentCitation[]> {
    return ids.flatMap((id) => this.#citations.get(id) ?? []);
  }

  async runScenario(query: DoraAgentQuery, percentageChange: number) {
    const selected = selectCommodities(query.commodityIds)[0];
    if (!selected)
      throw new Error("Select a commodity before running a scenario.");
    const scenarioValue = selected.price * (1 + percentageChange / 100);
    return {
      name: `${selected.name} ${percentageChange >= 0 ? "+" : ""}${percentageChange}% sensitivity`,
      assumptions: [
        `Only ${selected.name} changes by ${percentageChange}%.`,
        "No demand response, substitution, currency, or contract effects are modeled.",
      ],
      calculatedEffects: [
        `${selected.name} moves from ${selected.price.toFixed(2)} to ${scenarioValue.toFixed(2)} ${selected.currency}/${selected.unit}.`,
      ],
      limitations: [
        "This is arithmetic sensitivity analysis, not a market forecast.",
      ],
    };
  }
}

function selectCommodities(ids: readonly string[]) {
  if (!ids.length) return commandCommodities.slice(0, 4);
  const requested = new Set(ids.map((value) => value.toLowerCase()));
  return commandCommodities.filter(
    (commodity) =>
      requested.has(commodity.symbol.toLowerCase()) ||
      requested.has(commodity.name.toLowerCase()) ||
      [...requested].some((value) =>
        commodity.name.toLowerCase().includes(value),
      ),
  );
}

function withinDateRange(timestamp: string, query: DoraAgentQuery): boolean {
  const value = Date.parse(timestamp);
  if (!Number.isFinite(value)) return false;
  return (
    (!query.dateFrom || value >= Date.parse(query.dateFrom)) &&
    (!query.dateTo || value <= Date.parse(query.dateTo))
  );
}
