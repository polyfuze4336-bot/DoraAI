import { DefaultAzureCredential, type TokenCredential } from "@azure/identity";
import { Pool, type PoolConfig } from "pg";

import type { DoraSignal, NormalizedManufacturingStatus } from "@dora/shared";

import type { ManufacturingStore, OperationalStore } from "./contracts";

export interface PostgresStoreConfig {
  readonly host: string;
  readonly port?: number;
  readonly database: string;
  readonly user: string;
  readonly ssl?: boolean;
  readonly password?: string;
  readonly useEntraIdentity?: boolean;
  readonly maxConnections?: number;
}

export class PostgresOperationalStore
  implements OperationalStore, ManufacturingStore
{
  readonly #pool: Pool;

  constructor(
    config: PostgresStoreConfig,
    credential: TokenCredential = new DefaultAzureCredential(),
  ) {
    this.#pool = new Pool(createPostgresPoolConfig(config, credential));
  }

  async upsertSignals(signals: readonly DoraSignal[]): Promise<number> {
    if (!signals.length) return 0;
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      const commodities = new Map(
        signals
          .filter((signal) => signal.commodity)
          .map((signal) => [signal.commodity!.id, signal] as const),
      );
      for (const signal of commodities.values()) {
        const commodity = signal.commodity!;
        await client.query(
          `INSERT INTO commodities (
             commodity_id, symbol, name, default_unit, metadata
           ) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (commodity_id) DO UPDATE SET
             symbol = COALESCE(EXCLUDED.symbol, commodities.symbol),
             name = COALESCE(NULLIF(EXCLUDED.name, ''), commodities.name),
             default_unit = COALESCE(EXCLUDED.default_unit, commodities.default_unit),
             updated_at = now()`,
          [
            commodity.id,
            commodity.symbol ?? null,
            commodity.name ?? commodity.symbol ?? commodity.id,
            signal.unit,
            { source: signal.provider, discoveredFromSignal: true },
          ],
        );
      }
      for (const signal of signals) {
        await client.query(
          `INSERT INTO signals (
             signal_id, signal_type, source, provider, commodity_id, region,
             observed_at, ingested_at, value_numeric, value_text, unit,
             direction, magnitude, sentiment, relevance, confidence,
             freshness_status, headline, description, source_url, metadata,
             provenance, raw_reference
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
           ) ON CONFLICT (signal_id) DO UPDATE SET
             ingested_at = EXCLUDED.ingested_at,
             value_numeric = EXCLUDED.value_numeric,
             value_text = EXCLUDED.value_text,
             direction = EXCLUDED.direction,
             magnitude = EXCLUDED.magnitude,
             sentiment = EXCLUDED.sentiment,
             relevance = EXCLUDED.relevance,
             confidence = EXCLUDED.confidence,
             freshness_status = EXCLUDED.freshness_status,
             headline = EXCLUDED.headline,
             description = EXCLUDED.description,
             metadata = EXCLUDED.metadata,
             provenance = EXCLUDED.provenance,
             raw_reference = EXCLUDED.raw_reference`,
          [
            signal.signalId,
            signal.signalType,
            signal.source,
            signal.provider,
            signal.commodity?.id ?? null,
            signal.region,
            signal.timestamp,
            signal.ingestedAt,
            typeof signal.value === "number" ? signal.value : null,
            typeof signal.value === "string" ? signal.value : null,
            signal.unit,
            signal.direction,
            signal.magnitude,
            signal.sentiment,
            signal.relevance,
            signal.confidence,
            signal.freshness.status,
            signal.headline,
            signal.description,
            signal.sourceUrl,
            signal.metadata,
            signal.provenance,
            signal.rawReference,
          ],
        );
      }
      await client.query("COMMIT");
      return signals.length;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async startIngestionRun(input: {
    readonly runId: string;
    readonly providerId: string;
    readonly sourceId?: string;
    readonly startedAt: string;
    readonly nextRunAt?: string;
  }): Promise<void> {
    await this.#pool.query(
      `INSERT INTO ingestion_runs (
         run_id, provider_id, source_id, status, started_at, next_run_at
       ) VALUES ($1, $2, $3, 'running', $4, $5)
       ON CONFLICT (run_id) DO UPDATE SET
         status = 'running', started_at = EXCLUDED.started_at,
         next_run_at = EXCLUDED.next_run_at, error_message = NULL`,
      [
        input.runId,
        input.providerId,
        input.sourceId ?? null,
        input.startedAt,
        input.nextRunAt ?? null,
      ],
    );
  }

  async completeIngestionRun(input: {
    readonly runId: string;
    readonly status: "completed" | "partial" | "failed" | "skipped";
    readonly completedAt: string;
    readonly fetchedItems: number;
    readonly normalizedItems: number;
    readonly signalItems: number;
    readonly rawPath?: string;
    readonly normalizedPath?: string;
    readonly signalPath?: string;
    readonly errorMessage?: string;
    readonly nextRunAt?: string;
  }): Promise<void> {
    await this.#pool.query(
      `UPDATE ingestion_runs SET
         status = $2, completed_at = $3, fetched_items = $4,
         normalized_items = $5, signal_items = $6, raw_path = $7,
         normalized_path = $8, signal_path = $9, error_message = $10,
         next_run_at = $11
       WHERE run_id = $1`,
      [
        input.runId,
        input.status,
        input.completedAt,
        input.fetchedItems,
        input.normalizedItems,
        input.signalItems,
        input.rawPath ?? null,
        input.normalizedPath ?? null,
        input.signalPath ?? null,
        input.errorMessage ?? null,
        input.nextRunAt ?? null,
      ],
    );
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      await this.#pool.query("SELECT 1");
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        message:
          error instanceof Error
            ? error.message
            : "PostgreSQL health check failed.",
      };
    }
  }

  async listManufacturingStatus(
    filters: {
      readonly region?: string;
      readonly status?: NormalizedManufacturingStatus["status"];
      readonly limit?: number;
    } = {},
  ): Promise<readonly NormalizedManufacturingStatus[]> {
    const limit = Math.min(Math.max(filters.limit ?? 200, 1), 1_000);
    const result = await this.#pool.query<{
      record_id: string;
      site: string;
      region: string;
      product: string;
      capacity: number;
      utilization: number;
      planned_output: number;
      actual_output: number;
      downtime_hours: number;
      inventory: number;
      feedstock_availability: number;
      demand_indicator: number;
      status: NormalizedManufacturingStatus["status"];
      observed_at: Date;
      data_origin: NormalizedManufacturingStatus["dataOrigin"];
    }>(
      `SELECT record_id, site, region, product, capacity, utilization,
              planned_output, actual_output, downtime_hours, inventory,
              feedstock_availability, demand_indicator, status, observed_at,
              data_origin
         FROM manufacturing_status
        WHERE ($1::text IS NULL OR region = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY observed_at DESC, site ASC
        LIMIT $3`,
      [filters.region ?? null, filters.status ?? null, limit],
    );
    return result.rows.map((row) => ({
      recordId: row.record_id,
      site: row.site,
      region: row.region,
      product: row.product,
      capacity: Number(row.capacity),
      utilization: Number(row.utilization),
      plannedOutput: Number(row.planned_output),
      actualOutput: Number(row.actual_output),
      downtime: Number(row.downtime_hours),
      inventory: Number(row.inventory),
      feedstockAvailability: Number(row.feedstock_availability),
      demandIndicator: Number(row.demand_indicator),
      status: row.status,
      timestamp: row.observed_at.toISOString(),
      dataOrigin: row.data_origin,
    }));
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }
}

export function createPostgresPoolConfig(
  config: PostgresStoreConfig,
  credential: TokenCredential = new DefaultAzureCredential(),
): PoolConfig {
  return {
    host: config.host,
    port: config.port ?? 5432,
    database: config.database,
    user: config.user,
    ssl: config.ssl === false ? false : { rejectUnauthorized: true },
    max: config.maxConnections ?? 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    password: config.useEntraIdentity
      ? async () => {
          const token = await credential.getToken(
            "https://ossrdbms-aad.database.windows.net/.default",
          );
          if (!token) {
            throw new Error("Unable to acquire PostgreSQL Entra token.");
          }
          return token.token;
        }
      : config.password,
  };
}
