import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { NormalizedManufacturingStatus } from "@dora/shared";

import type { ManufacturingStore } from "./contracts";

export class LocalSqliteManufacturingStore implements ManufacturingStore {
  readonly #database: DatabaseSync;

  private constructor(database: DatabaseSync) {
    this.#database = database;
  }

  static async open(
    databasePath: string,
    seedPath: string,
  ): Promise<LocalSqliteManufacturingStore> {
    await mkdir(dirname(databasePath), { recursive: true });
    const store = new LocalSqliteManufacturingStore(
      new DatabaseSync(databasePath),
    );
    store.initialize(seedPath);
    return store;
  }

  async listManufacturingStatus(
    filters: {
      readonly region?: string;
      readonly status?: NormalizedManufacturingStatus["status"];
      readonly limit?: number;
    } = {},
  ): Promise<readonly NormalizedManufacturingStatus[]> {
    const rows = this.#database
      .prepare(
        `SELECT record_id, site, region, product, capacity, utilization,
                planned_output, actual_output, downtime_hours, inventory,
                feedstock_availability, demand_indicator, status, observed_at,
                data_origin
           FROM manufacturing_status
          WHERE (? IS NULL OR region = ?)
            AND (? IS NULL OR status = ?)
          ORDER BY observed_at DESC, site ASC
          LIMIT ?`,
      )
      .all(
        filters.region ?? null,
        filters.region ?? null,
        filters.status ?? null,
        filters.status ?? null,
        Math.min(Math.max(filters.limit ?? 200, 1), 1_000),
      ) as unknown as LocalManufacturingRow[];
    return rows.map(mapRow);
  }

  close(): void {
    this.#database.close();
  }

  private initialize(seedPath: string): void {
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS manufacturing_status (
        record_id TEXT PRIMARY KEY,
        site TEXT NOT NULL,
        region TEXT NOT NULL,
        product TEXT NOT NULL,
        capacity REAL NOT NULL,
        utilization REAL NOT NULL,
        planned_output REAL NOT NULL,
        actual_output REAL NOT NULL,
        downtime_hours REAL NOT NULL,
        inventory REAL NOT NULL,
        feedstock_availability REAL NOT NULL,
        demand_indicator REAL NOT NULL,
        status TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        data_origin TEXT NOT NULL
      ) STRICT;
    `);
    const count = this.#database
      .prepare("SELECT COUNT(*) AS count FROM manufacturing_status")
      .get() as unknown as { count: number };
    if (Number(count.count) > 0) return;
    const records = JSON.parse(
      readFileSync(seedPath, "utf8"),
    ) as NormalizedManufacturingStatus[];
    const insert = this.#database.prepare(`
      INSERT INTO manufacturing_status (
        record_id, site, region, product, capacity, utilization,
        planned_output, actual_output, downtime_hours, inventory,
        feedstock_availability, demand_indicator, status, observed_at, data_origin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.#database.exec("BEGIN");
    try {
      for (const record of records) {
        insert.run(
          record.recordId,
          record.site,
          record.region,
          record.product,
          record.capacity,
          record.utilization,
          record.plannedOutput,
          record.actualOutput,
          record.downtime,
          record.inventory,
          record.feedstockAvailability,
          record.demandIndicator,
          record.status,
          record.timestamp,
          record.dataOrigin,
        );
      }
      this.#database.exec("COMMIT");
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
  }
}

interface LocalManufacturingRow {
  readonly record_id: string;
  readonly site: string;
  readonly region: string;
  readonly product: string;
  readonly capacity: number;
  readonly utilization: number;
  readonly planned_output: number;
  readonly actual_output: number;
  readonly downtime_hours: number;
  readonly inventory: number;
  readonly feedstock_availability: number;
  readonly demand_indicator: number;
  readonly status: NormalizedManufacturingStatus["status"];
  readonly observed_at: string;
  readonly data_origin: NormalizedManufacturingStatus["dataOrigin"];
}

function mapRow(row: LocalManufacturingRow): NormalizedManufacturingStatus {
  return {
    recordId: row.record_id,
    site: row.site,
    region: row.region,
    product: row.product,
    capacity: row.capacity,
    utilization: row.utilization,
    plannedOutput: row.planned_output,
    actualOutput: row.actual_output,
    downtime: row.downtime_hours,
    inventory: row.inventory,
    feedstockAvailability: row.feedstock_availability,
    demandIndicator: row.demand_indicator,
    status: row.status,
    timestamp: row.observed_at,
    dataOrigin: row.data_origin,
  };
}
