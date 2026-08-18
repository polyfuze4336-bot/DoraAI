import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { runPostgresMigrations } from "./migrations";

async function main(): Promise<void> {
  const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
  const environmentPath = resolve(root, ".env.local");
  if (existsSync(environmentPath)) process.loadEnvFile(environmentPath);
  const host = required("PGHOST");
  const database = required("PGDATABASE");
  const user = required("PGUSER");
  const applied = await runPostgresMigrations(
    {
      host,
      database,
      user,
      port: Number(process.env.PGPORT ?? 5432),
      password: process.env.PGPASSWORD,
      useEntraIdentity: process.env.PG_USE_ENTRA_IDENTITY !== "false",
      ssl: process.env.PGSSL !== "false",
    },
    resolve(root, "infrastructure/database/migrations"),
  );
  console.info(
    JSON.stringify({ event: "database.migrated", applied, database, host }),
  );
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      event: "database.migration-failed",
      message: error instanceof Error ? error.message : "Migration failed.",
    }),
  );
  process.exitCode = 1;
});
