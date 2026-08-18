import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { DefaultAzureCredential } from "@azure/identity";
import { Pool, type PoolClient } from "pg";

import { runPostgresMigrations } from "./migrations";
import { createPostgresPoolConfig } from "./postgres-store";

async function main(): Promise<void> {
  const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
  const environmentPath = resolve(root, ".env.local");
  if (existsSync(environmentPath)) process.loadEnvFile(environmentPath);

  const host = required("PGHOST");
  const database = required("PGDATABASE");
  const administrator = required("PGUSER");
  const workloadName = required("PG_WORKLOAD_PRINCIPAL_NAME");
  const workloadObjectId = required("PG_WORKLOAD_PRINCIPAL_ID");
  const credential = new DefaultAzureCredential();
  const config = {
    host,
    database,
    user: administrator,
    port: Number(process.env.PGPORT ?? 5432),
    useEntraIdentity: true,
    ssl: true,
  } as const;

  const applied = await runPostgresMigrations(
    config,
    resolve(root, "infrastructure/database/migrations"),
    credential,
  );

  const identityPool = new Pool(
    createPostgresPoolConfig({ ...config, database: "postgres" }, credential),
  );
  const identityClient = await identityPool.connect();
  try {
    await ensureWorkloadPrincipal(
      identityClient,
      workloadName,
      workloadObjectId,
    );
  } finally {
    identityClient.release();
    await identityPool.end();
  }

  const pool = new Pool(createPostgresPoolConfig(config, credential));
  const client = await pool.connect();
  try {
    const principal = quoteIdentifier(workloadName);
    const targetDatabase = quoteIdentifier(database);
    await client.query(`GRANT CONNECT ON DATABASE ${targetDatabase} TO ${principal}`);
    await client.query(`GRANT USAGE ON SCHEMA public TO ${principal}`);
    await client.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${principal}`,
    );
    await client.query(
      `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${principal}`,
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${principal}`,
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${principal}`,
    );
  } finally {
    client.release();
    await pool.end();
  }

  console.info(
    JSON.stringify({
      event: "database.azure-bootstrap-completed",
      database,
      host,
      workloadName,
      applied,
    }),
  );
}

async function ensureWorkloadPrincipal(
  client: PoolClient,
  workloadName: string,
  workloadObjectId: string,
): Promise<void> {
  const existing = await client.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists",
    [workloadName],
  );
  if (existing.rows[0]?.exists) return;

  const functions = await client.query<{ name: string; arguments: string }>(
    `SELECT proname AS name, pg_get_function_identity_arguments(oid) AS arguments
     FROM pg_proc
     WHERE proname LIKE 'pgaadauth_create_principal%'
     ORDER BY proname`,
  );
  if (
    functions.rows.some(
      (item) => item.name === "pgaadauth_create_principal_with_oid",
    )
  ) {
    await client.query(
      "SELECT * FROM pg_catalog.pgaadauth_create_principal_with_oid($1::text, $2::text, 'service'::text, false, false)",
      [workloadName, workloadObjectId],
    );
    return;
  }
  if (
    functions.rows.some(
      (item) => item.name === "pgaadauth_create_principal",
    )
  ) {
    await client.query(
      "SELECT * FROM pg_catalog.pgaadauth_create_principal($1::text, false, false)",
      [workloadName],
    );
    return;
  }
  throw new Error(
    `No supported pgaadauth principal function is available: ${functions.rows
      .map((item) => `${item.name}(${item.arguments})`)
      .join(", ")}`,
  );
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      event: "database.azure-bootstrap-failed",
      message: error instanceof Error ? error.message : "Bootstrap failed.",
    }),
  );
  process.exitCode = 1;
});