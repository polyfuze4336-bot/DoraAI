import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { DefaultAzureCredential, type TokenCredential } from "@azure/identity";
import { Pool } from "pg";

import {
  createPostgresPoolConfig,
  type PostgresStoreConfig,
} from "./postgres-store";

export async function runPostgresMigrations(
  config: PostgresStoreConfig,
  migrationsDirectory: string,
  credential: TokenCredential = new DefaultAzureCredential(),
): Promise<readonly string[]> {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d+.*\.sql$/i.test(file))
    .sort();
  const pool = new Pool(createPostgresPoolConfig(config, credential));
  const applied: string[] = [];
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    await client.query("SELECT pg_advisory_lock($1)", [730241]);
    for (const file of files) {
      const sql = await readFile(join(migrationsDirectory, file), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await client.query<{ checksum: string }>(
        "SELECT checksum FROM schema_migrations WHERE migration_name = $1",
        [file],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== checksum) {
          throw new Error(`Applied migration ${file} has changed.`);
        }
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (migration_name, checksum) VALUES ($1, $2)",
          [file, checksum],
        );
        await client.query("COMMIT");
        applied.push(file);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    return applied;
  } finally {
    await client
      .query("SELECT pg_advisory_unlock($1)", [730241])
      .catch(() => undefined);
    client.release();
    await pool.end();
  }
}
