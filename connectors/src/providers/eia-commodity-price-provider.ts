import type { CommodityObservation } from "@dora/shared";
import { z } from "zod";

import type {
  CommodityPriceProvider,
  CommodityPriceQuery,
  ProviderContext,
  ProviderFetchResult,
  ProviderHealth,
  ProviderValidationIssue,
  ProviderValidationResult,
} from "../contracts";
import { providerRuntimePolicySchema } from "../provider-config";
import { createProvenance } from "../provenance";
import {
  defaultProviderRuntimePolicy,
  redactUrl,
  ResilientHttpClient,
} from "../resilience";

const seriesDefinitionSchema = z.object({
  commodityId: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().min(1),
  currency: z.string().length(3),
  unit: z.string().min(1),
  geography: z.string().min(1).optional(),
});

const eiaProviderConfigSchema = z.object({
  id: z.string().min(1).default("eia"),
  apiKey: z.string().min(1),
  baseUrl: z.url(),
  runtime: providerRuntimePolicySchema.default(defaultProviderRuntimePolicy),
  series: z.record(z.string(), seriesDefinitionSchema),
  observationsPerSeries: z.number().int().min(1).max(5_000).default(120),
});

export type EiaProviderConfig = z.input<typeof eiaProviderConfigSchema>;
type ResolvedEiaProviderConfig = z.output<typeof eiaProviderConfigSchema>;

const eiaDatumSchema = z
  .object({
    period: z.string().optional(),
    value: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

const eiaPayloadSchema = z
  .object({
    response: z
      .object({
        data: z.array(eiaDatumSchema).optional(),
      })
      .passthrough()
      .optional(),
    apiVersion: z.string().optional(),
  })
  .passthrough();

type EiaPayload = z.infer<typeof eiaPayloadSchema>;

export interface EiaSeriesPayload {
  readonly seriesId: string;
  readonly payload: EiaPayload;
  readonly sourceUrl: string;
  readonly fetchedAt: string;
}

export class EiaCommodityPriceProvider implements CommodityPriceProvider<
  readonly EiaSeriesPayload[]
> {
  readonly id: string;
  readonly kind = "commodity-price" as const;
  readonly #config: ResolvedEiaProviderConfig;
  readonly #client: ResilientHttpClient;

  constructor(
    config: EiaProviderConfig,
    fetchImplementation: typeof fetch = fetch,
  ) {
    this.#config = eiaProviderConfigSchema.parse(config);
    this.id = this.#config.id;
    this.#client = new ResilientHttpClient(
      this.id,
      this.#config.runtime,
      fetchImplementation,
    );
  }

  async fetch(
    query: CommodityPriceQuery,
    context: ProviderContext,
  ): Promise<ProviderFetchResult<readonly EiaSeriesPayload[]>> {
    const requestedSeries = Object.entries(this.#config.series).filter(
      ([, definition]) =>
        query.commodityIds?.length
          ? query.commodityIds.includes(definition.commodityId)
          : true,
    );

    const data = await Promise.all(
      requestedSeries.map(async ([seriesId]) => {
        const url = new URL(
          `/v2/seriesid/${encodeURIComponent(seriesId)}`,
          this.#config.baseUrl,
        );
        url.searchParams.set("api_key", this.#config.apiKey);
        url.searchParams.set(
          "length",
          String(this.#config.observationsPerSeries),
        );
        url.searchParams.set("sort[0][column]", "period");
        url.searchParams.set("sort[0][direction]", "desc");

        const response = await this.#client.request(url, {
          headers: { accept: "application/json" },
          signal: context.signal,
        });
        const fetchedAt = new Date().toISOString();
        const payload = eiaPayloadSchema.parse(await response.json());

        return {
          seriesId,
          payload,
          sourceUrl: redactUrl(url),
          fetchedAt,
        };
      }),
    );

    return {
      data,
      fetchedAt: new Date().toISOString(),
      sourceVersion: data[0]?.payload.apiVersion,
      metadata: {
        correlationId: context.correlationId,
        provider: this.id,
        seriesCount: String(data.length),
      },
    };
  }

  async validate(
    data: readonly EiaSeriesPayload[],
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

      const rows = series.payload.response?.data;
      if (!rows?.length) {
        issues.push({
          path: `${series.seriesId}.response.data`,
          message: "Series contains no observations.",
          severity: "error",
        });
        continue;
      }

      rows.forEach((row, index) => {
        if (!row.period || !Number.isFinite(Number(row.value))) {
          issues.push({
            path: `${series.seriesId}.response.data[${index}]`,
            message: "Observation requires a period and numeric value.",
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
    data: readonly EiaSeriesPayload[],
    context: ProviderContext,
  ): Promise<readonly CommodityObservation[]> {
    return data.flatMap((series) => {
      const definition = this.#config.series[series.seriesId];
      if (!definition) {
        return [];
      }

      return (series.payload.response?.data ?? []).flatMap((row) => {
        const value = Number(row.value);
        if (!row.period || !Number.isFinite(value)) {
          return [];
        }

        return [
          {
            providerId: this.id,
            externalId: `${series.seriesId}:${row.period}`,
            commodityId: definition.commodityId,
            symbol: definition.symbol,
            name: definition.name,
            observedAt: normalizeEiaPeriod(row.period),
            retrievedAt: context.requestedAt,
            price: value,
            currency: definition.currency,
            unit: definition.unit,
            geography: definition.geography,
            provenance: createProvenance({
              providerId: this.id,
              sourceId: series.seriesId,
              sourceUrl: series.sourceUrl,
              sourceTimestamp: normalizeEiaPeriod(row.period),
              fetchedAt: series.fetchedAt,
              ingestedAt: context.requestedAt,
              correlationId: context.correlationId,
              license: "U.S. Government public data",
              termsUrl: "https://www.eia.gov/opendata/terms-of-service.php",
              rawValue: row,
            }),
          },
        ];
      });
    });
  }

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();
    const firstSeries = Object.values(this.#config.series)[0];

    if (!firstSeries) {
      return {
        providerId: this.id,
        status: "not-configured",
        checkedAt,
        message: "No EIA series are configured.",
      };
    }

    const startedAt = performance.now();
    try {
      const result = await this.fetch(
        { commodityIds: [firstSeries.commodityId] },
        {
          correlationId: `health-${crypto.randomUUID()}`,
          requestedAt: checkedAt,
        },
      );

      return {
        providerId: this.id,
        status: "healthy",
        checkedAt,
        latencyMs: Math.round(performance.now() - startedAt),
        lastSourceTimestamp: result.data[0]?.payload.response?.data?.[0]?.period
          ? normalizeEiaPeriod(result.data[0].payload.response.data[0].period)
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
          error instanceof Error ? error.message : "Unknown provider failure.",
      };
    }
  }
}

function normalizeEiaPeriod(period: string): string {
  if (/^\d{4}$/.test(period)) {
    return `${period}-01-01T00:00:00.000Z`;
  }

  if (/^\d{4}-\d{2}$/.test(period)) {
    return `${period}-01T00:00:00.000Z`;
  }

  if (/^\d{8}$/.test(period)) {
    return `${period.slice(0, 4)}-${period.slice(4, 6)}-${period.slice(6, 8)}T00:00:00.000Z`;
  }

  const parsed = new Date(period);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Unsupported EIA period: ${period}`);
  }

  return parsed.toISOString();
}
