import type { NewsItem } from "@dora/shared";
import { z } from "zod";

import type {
  NewsProvider,
  NewsQuery,
  ProviderContext,
  ProviderFetchResult,
  ProviderHealth,
  ProviderValidationIssue,
  ProviderValidationResult,
} from "../contracts";
import type { GdeltProviderDefinition } from "../provider-config";
import { createProvenance } from "../provenance";
import { ResilientHttpClient } from "../resilience";

const gdeltArticleSchema = z
  .object({
    url: z.url(),
    title: z.string().min(1),
    seendate: z.string().min(8),
    domain: z.string().optional(),
    language: z.string().optional(),
    sourcecountry: z.string().optional(),
  })
  .passthrough();

const gdeltPayloadSchema = z
  .object({
    articles: z.array(gdeltArticleSchema).default([]),
  })
  .passthrough();

type GdeltPayload = z.infer<typeof gdeltPayloadSchema>;

export interface GdeltQueryPayload {
  readonly queryId: string;
  readonly commodityIds: readonly string[];
  readonly payload: GdeltPayload;
  readonly sourceUrl: string;
  readonly fetchedAt: string;
}

export class GdeltNewsProvider implements NewsProvider<
  readonly GdeltQueryPayload[]
> {
  readonly id: string;
  readonly kind = "news" as const;
  readonly #config: GdeltProviderDefinition;
  readonly #client: ResilientHttpClient;

  constructor(
    config: GdeltProviderDefinition,
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
    query: NewsQuery,
    context: ProviderContext,
  ): Promise<ProviderFetchResult<readonly GdeltQueryPayload[]>> {
    const requestedQueries = Object.entries(this.#config.queries).filter(
      ([, definition]) =>
        query.commodityIds?.length
          ? definition.commodityIds.some((id) =>
              query.commodityIds?.includes(id),
            )
          : true,
    );

    const data = await Promise.all(
      requestedQueries.map(async ([queryId, definition]) => {
        const url = new URL("/api/v2/doc/doc", this.#config.baseUrl);
        url.searchParams.set("query", definition.query);
        url.searchParams.set("mode", "artlist");
        url.searchParams.set("format", "json");
        url.searchParams.set("sort", "datedesc");
        url.searchParams.set("maxrecords", String(this.#config.maxRecords));
        if (query.publishedAfter) {
          url.searchParams.set(
            "startdatetime",
            formatGdeltDate(query.publishedAfter),
          );
        } else {
          url.searchParams.set("timespan", this.#config.timespan);
        }

        const response = await this.#client.request(url, {
          headers: { accept: "application/json" },
          signal: context.signal,
        });

        return {
          queryId,
          commodityIds: definition.commodityIds,
          payload: gdeltPayloadSchema.parse(await response.json()),
          sourceUrl: url.toString(),
          fetchedAt: new Date().toISOString(),
        };
      }),
    );

    return {
      data,
      fetchedAt: new Date().toISOString(),
      metadata: {
        correlationId: context.correlationId,
        provider: this.id,
        queryCount: String(data.length),
        articleCount: String(
          data.reduce((count, item) => count + item.payload.articles.length, 0),
        ),
      },
    };
  }

  async validate(
    data: readonly GdeltQueryPayload[],
  ): Promise<ProviderValidationResult> {
    const issues: ProviderValidationIssue[] = [];

    for (const query of data) {
      if (!this.#config.queries[query.queryId]) {
        issues.push({
          path: query.queryId,
          message: "Query is not present in provider configuration.",
          severity: "error",
        });
      }

      query.payload.articles.forEach((article, index) => {
        try {
          normalizeGdeltDate(article.seendate);
        } catch {
          issues.push({
            path: `${query.queryId}.articles[${index}].seendate`,
            message: "Article timestamp is invalid.",
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
    data: readonly GdeltQueryPayload[],
    context: ProviderContext,
  ): Promise<readonly NewsItem[]> {
    const seen = new Set<string>();

    return data.flatMap((query) =>
      query.payload.articles.flatMap((article) => {
        if (seen.has(article.url)) {
          return [];
        }
        seen.add(article.url);

        const publishedAt = normalizeGdeltDate(article.seendate);
        return [
          {
            providerId: this.id,
            externalId: article.url,
            headline: article.title,
            summary: [article.domain, article.sourcecountry, article.language]
              .filter(Boolean)
              .join(" | "),
            publishedAt,
            retrievedAt: context.requestedAt,
            sourceUrl: article.url,
            commodityIds: query.commodityIds,
            provenance: createProvenance({
              providerId: this.id,
              sourceId: article.url,
              sourceUrl: article.url,
              sourceTimestamp: publishedAt,
              fetchedAt: query.fetchedAt,
              ingestedAt: context.requestedAt,
              correlationId: context.correlationId,
              license: "GDELT Project open data",
              termsUrl: "https://www.gdeltproject.org/about.html#termsofuse",
              rawValue: article,
            }),
          },
        ];
      }),
    );
  }

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();
    if (!Object.keys(this.#config.queries).length) {
      return {
        providerId: this.id,
        status: "not-configured",
        checkedAt,
        message: "No GDELT queries are configured.",
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
      const sourceTimestamp = result.data[0]?.payload.articles[0]?.seendate;
      return {
        providerId: this.id,
        status: "healthy",
        checkedAt,
        latencyMs: Math.round(performance.now() - startedAt),
        lastSourceTimestamp: sourceTimestamp
          ? normalizeGdeltDate(sourceTimestamp)
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
          error instanceof Error ? error.message : "Unknown GDELT failure.",
      };
    }
  }
}

function normalizeGdeltDate(value: string): string {
  const compact = /^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?$/.exec(
    value,
  );
  if (compact) {
    const [, year, month, day, hour, minute, second] = compact;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Unsupported GDELT timestamp: ${value}`);
  }
  return parsed.toISOString();
}

function formatGdeltDate(value: string): string {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "");
}
