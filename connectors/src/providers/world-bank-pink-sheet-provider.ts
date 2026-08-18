import type { CommodityObservation } from "@dora/shared";
import readExcelFile from "read-excel-file/node";
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
import type { WorldBankProviderDefinition } from "../provider-config";
import { createProvenance } from "../provenance";
import { ResilientHttpClient } from "../resilience";

const pinkSheetValueSchema = z.union([z.number(), z.string(), z.null()]);
const pinkSheetRowSchema = z.object({
  period: z.string(),
  values: z.record(z.string(), pinkSheetValueSchema),
});

const pinkSheetPayloadSchema = z.object({
  headers: z.array(z.string()),
  units: z.record(z.string(), z.string()),
  rows: z.array(pinkSheetRowSchema),
  sourceUpdatedAt: z.string(),
  sourceUrl: z.url(),
  fetchedAt: z.string(),
});

export type WorldBankPinkSheetPayload = z.infer<typeof pinkSheetPayloadSchema>;

export class WorldBankPinkSheetProvider implements CommodityPriceProvider<WorldBankPinkSheetPayload> {
  readonly id: string;
  readonly kind = "commodity-price" as const;
  readonly #config: WorldBankProviderDefinition;
  readonly #client: ResilientHttpClient;

  constructor(
    config: WorldBankProviderDefinition,
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
    _query: CommodityPriceQuery,
    context: ProviderContext,
  ): Promise<ProviderFetchResult<WorldBankPinkSheetPayload>> {
    const response = await this.#client.request(this.#config.downloadUrl, {
      headers: {
        accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      signal: context.signal,
    });
    const fetchedAt = new Date().toISOString();
    const workbook = await readExcelFile(
      Buffer.from(await response.arrayBuffer()),
    );
    const sheet = workbook.find(
      (candidate) => candidate.sheet === this.#config.sheetName,
    );

    if (!sheet) {
      throw new Error(
        `${this.id}: sheet '${this.#config.sheetName}' was not found.`,
      );
    }

    const headerRow = sheet.data[4] ?? [];
    const unitRow = sheet.data[5] ?? [];
    const headers = headerRow.map((cell) => String(cell ?? ""));
    const units = Object.fromEntries(
      headers.flatMap((header, index) =>
        header ? [[header, String(unitRow[index] ?? "")]] : [],
      ),
    );
    const sourceUpdatedAt = parseWorkbookUpdate(
      String(sheet.data[3]?.[0] ?? ""),
      fetchedAt,
    );
    const rows = sheet.data
      .slice(6)
      .flatMap((row) => {
        const period = String(row[0] ?? "");
        if (!/^\d{4}M\d{2}$/.test(period)) {
          return [];
        }

        return [
          {
            period,
            values: Object.fromEntries(
              headers.flatMap((header, index) =>
                header ? [[header, normalizeCell(row[index])]] : [],
              ),
            ),
          },
        ];
      })
      .slice(-this.#config.maxMonths);

    const data = pinkSheetPayloadSchema.parse({
      headers,
      units,
      rows,
      sourceUpdatedAt,
      sourceUrl: this.#config.downloadUrl,
      fetchedAt,
    });

    return {
      data,
      fetchedAt,
      sourceVersion: sourceUpdatedAt,
      metadata: {
        correlationId: context.correlationId,
        provider: this.id,
        rows: String(rows.length),
        sheet: this.#config.sheetName,
      },
    };
  }

  async validate(
    data: WorldBankPinkSheetPayload,
  ): Promise<ProviderValidationResult> {
    const issues: ProviderValidationIssue[] = [];
    for (const columnName of Object.keys(this.#config.columns)) {
      if (!data.headers.includes(columnName)) {
        issues.push({
          path: `headers.${columnName}`,
          message: "Configured Pink Sheet column is missing.",
          severity: "error",
        });
      }
    }

    if (!data.rows.length) {
      issues.push({
        path: "rows",
        message: "Pink Sheet contains no monthly observations.",
        severity: "error",
      });
    }

    return {
      valid: !issues.some((issue) => issue.severity === "error"),
      issues,
    };
  }

  async normalize(
    data: WorldBankPinkSheetPayload,
    context: ProviderContext,
  ): Promise<readonly CommodityObservation[]> {
    return data.rows.flatMap((row) =>
      Object.entries(this.#config.columns).flatMap(
        ([columnName, definition]) => {
          const value = row.values[columnName];
          if (typeof value !== "number" || !Number.isFinite(value)) {
            return [];
          }

          const observedAt = normalizeWorldBankPeriod(row.period);
          return [
            {
              providerId: this.id,
              externalId: `${columnName}:${row.period}`,
              commodityId: definition.commodityId,
              symbol: definition.symbol,
              name: definition.name,
              observedAt,
              publishedAt: data.sourceUpdatedAt,
              retrievedAt: context.requestedAt,
              price: value,
              currency: definition.currency,
              unit: definition.unit,
              geography: definition.geography,
              provenance: createProvenance({
                providerId: this.id,
                sourceId: columnName,
                sourceUrl: data.sourceUrl,
                sourceTimestamp: observedAt,
                fetchedAt: data.fetchedAt,
                ingestedAt: context.requestedAt,
                correlationId: context.correlationId,
                license: "World Bank Dataset Terms of Use",
                termsUrl:
                  "https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets",
                rawValue: { period: row.period, value, columnName },
              }),
            },
          ];
        },
      ),
    );
  }

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();
    const startedAt = performance.now();
    try {
      await this.#client.request(this.#config.downloadUrl, { method: "HEAD" });
      return {
        providerId: this.id,
        status: "healthy",
        checkedAt,
        latencyMs: Math.round(performance.now() - startedAt),
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
          error instanceof Error
            ? error.message
            : "Unknown World Bank provider failure.",
      };
    }
  }
}

function normalizeCell(value: unknown): number | string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }
  return String(value);
}

function normalizeWorldBankPeriod(period: string): string {
  const match = /^(\d{4})M(\d{2})$/.exec(period);
  if (!match?.[1] || !match[2]) {
    throw new Error(`Unsupported World Bank period: ${period}`);
  }
  return `${match[1]}-${match[2]}-01T00:00:00.000Z`;
}

function parseWorkbookUpdate(value: string, fallback: string): string {
  const dateText = value.replace(/^Updated on\s+/i, "").trim();
  const parsed = new Date(dateText);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}
