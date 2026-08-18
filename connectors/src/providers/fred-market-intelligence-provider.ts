import type { MarketIntelligenceRecord } from "@dora/shared";
import { z } from "zod";

import type {
  MarketIntelligenceProvider,
  MarketIntelligenceQuery,
  ProviderContext,
  ProviderFetchResult,
  ProviderHealth,
  ProviderValidationIssue,
  ProviderValidationResult,
} from "../contracts";
import type { FredProviderDefinition } from "../provider-config";
import { createProvenance } from "../provenance";
import { redactUrl, ResilientHttpClient } from "../resilience";

const fredObservationSchema = z.object({
  realtime_start: z.string(),
  realtime_end: z.string(),
  date: z.string(),
  value: z.string(),
});

const fredPayloadSchema = z
  .object({
    realtime_start: z.string(),
    realtime_end: z.string(),
    observations: z.array(fredObservationSchema),
  })
  .passthrough();

type FredPayload = z.infer<typeof fredPayloadSchema>;

export interface FredSeriesPayload {
  readonly seriesId: string;
  readonly payload: FredPayload;
  readonly sourceUrl: string;
  readonly fetchedAt: string;
}

export interface FredProviderConfig extends Omit<
  FredProviderDefinition,
  "authentication"
> {
  readonly apiKey: string;
}

export class FredMarketIntelligenceProvider implements MarketIntelligenceProvider<
  readonly FredSeriesPayload[]
> {
  readonly id: string;
  readonly kind = "market-intelligence" as const;
  readonly #config: FredProviderConfig;
  readonly #client: ResilientHttpClient;

  constructor(
    config: FredProviderConfig,
    fetchImplementation: typeof fetch = fetch,
  ) {
    this.#config = config;
    this.id = config.id;
    this.#client = new ResilientHttpClient(
      this.id,
      config.runtime,
      fetchImplementation,
    );
  }

  async fetch(
    query: MarketIntelligenceQuery,
    context: ProviderContext,
  ): Promise<ProviderFetchResult<readonly FredSeriesPayload[]>> {
    const requestedSeries = Object.entries(this.#config.series).filter(
      ([, definition]) =>
        query.commodityIds?.length
          ? definition.commodityIds.some((id) =>
              query.commodityIds?.includes(id),
            )
          : true,
    );

    const data = await Promise.all(
      requestedSeries.map(async ([seriesId]) => {
        const url = new URL("/fred/series/observations", this.#config.baseUrl);
        url.searchParams.set("api_key", this.#config.apiKey);
        url.searchParams.set("file_type", "json");
        url.searchParams.set("series_id", seriesId);
        url.searchParams.set("sort_order", "desc");
        url.searchParams.set(
          "limit",
          String(this.#config.observationsPerSeries),
        );
        if (query.effectiveAfter) {
          url.searchParams.set(
            "observation_start",
            query.effectiveAfter.slice(0, 10),
          );
        }

        const response = await this.#client.request(url, {
          headers: { accept: "application/json" },
          signal: context.signal,
        });

        return {
          seriesId,
          payload: fredPayloadSchema.parse(await response.json()),
          sourceUrl: redactUrl(url),
          fetchedAt: new Date().toISOString(),
        };
      }),
    );

    return {
      data,
      fetchedAt: new Date().toISOString(),
      sourceVersion: data[0]?.payload.realtime_end,
      metadata: {
        correlationId: context.correlationId,
        provider: this.id,
        seriesCount: String(data.length),
      },
    };
  }

  async validate(
    data: readonly FredSeriesPayload[],
  ): Promise<ProviderValidationResult> {
    const issues: ProviderValidationIssue[] = [];

    for (const series of data) {
      if (!this.#config.series[series.seriesId]) {
        issues.push({
          path: series.seriesId,
          message: "Series is not present in provider configuration.",
          severity: "error",
        });
      }

      series.payload.observations.forEach((observation, index) => {
        if (
          observation.value !== "." &&
          !Number.isFinite(Number(observation.value))
        ) {
          issues.push({
            path: `${series.seriesId}.observations[${index}].value`,
            message:
              "FRED observation must be numeric or the documented missing marker.",
            severity: "error",
          });
        }
      });
    }

    return {
      valid: !issues.some((issue) => issue.severity === "error"),
      issues,
    };
  }

  async normalize(
    data: readonly FredSeriesPayload[],
    context: ProviderContext,
  ): Promise<readonly MarketIntelligenceRecord[]> {
    return data.flatMap((series) => {
      const definition = this.#config.series[series.seriesId];
      if (!definition) {
        return [];
      }

      return series.payload.observations.flatMap((observation) => {
        const value = Number(observation.value);
        if (observation.value === "." || !Number.isFinite(value)) {
          return [];
        }

        const effectiveAt = `${observation.date}T00:00:00.000Z`;
        return [
          {
            providerId: this.id,
            externalId: `${series.seriesId}:${observation.date}:${observation.realtime_end}`,
            title: definition.title,
            body: JSON.stringify({
              seriesId: series.seriesId,
              value,
              unit: definition.unit,
              realtimeStart: observation.realtime_start,
              realtimeEnd: observation.realtime_end,
            }),
            effectiveAt,
            retrievedAt: context.requestedAt,
            commodityIds: definition.commodityIds,
            provenance: createProvenance({
              providerId: this.id,
              sourceId: series.seriesId,
              sourceUrl: series.sourceUrl,
              sourceTimestamp: effectiveAt,
              fetchedAt: series.fetchedAt,
              ingestedAt: context.requestedAt,
              correlationId: context.correlationId,
              license: "Federal Reserve Bank of St. Louis FRED terms",
              termsUrl:
                "https://fred.stlouisfed.org/docs/api/terms_of_use.html",
              rawValue: observation,
            }),
          },
        ];
      });
    });
  }

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();
    const firstSeriesId = Object.keys(this.#config.series)[0];
    if (!firstSeriesId) {
      return {
        providerId: this.id,
        status: "not-configured",
        checkedAt,
        message: "No FRED series are configured.",
      };
    }

    const startedAt = performance.now();
    try {
      const result = await this.fetch(
        {},
        {
          correlationId: `health-${crypto.randomUUID()}`,
          requestedAt: checkedAt,
        },
      );
      const sourceTimestamp = result.data[0]?.payload.observations[0]?.date;
      return {
        providerId: this.id,
        status: "healthy",
        checkedAt,
        latencyMs: Math.round(performance.now() - startedAt),
        lastSourceTimestamp: sourceTimestamp
          ? `${sourceTimestamp}T00:00:00.000Z`
          : undefined,
        consecutiveFailures: 0,
      };
    } catch (error) {
      return {
        providerId: this.id,
        status: "unavailable",
        checkedAt,
        latencyMs: Math.round(performance.now() - startedAt),
        consecutiveFailures: 1,
        message:
          error instanceof Error ? error.message : "Unknown FRED failure.",
      };
    }
  }
}
