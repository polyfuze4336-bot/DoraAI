import { hash } from "bcryptjs";
import { Pool } from "pg";

import { createPostgresPoolConfig } from "./postgres-store";

async function main(): Promise<void> {
  const username = required("DORA_INITIAL_ADMIN_USERNAME").toLowerCase();
  const password = required("DORA_INITIAL_ADMIN_PASSWORD");
  const displayName =
    process.env.DORA_INITIAL_ADMIN_DISPLAY_NAME?.trim() || "DORA Administrator";
  if (password.length < 14) {
    throw new Error("The initial administrator password must be at least 14 characters.");
  }
  const pool = new Pool(
    createPostgresPoolConfig({
      host: required("PGHOST"),
      database: required("PGDATABASE"),
      user: required("PGUSER"),
      port: Number(process.env.PGPORT ?? 5432),
      useEntraIdentity: true,
      ssl: true,
    }),
  );
  try {
    const passwordHash = await hash(password, 12);
    await pool.query(
      `INSERT INTO users (username, password_hash, display_name, role, is_active)
       VALUES ($1, $2, $3, 'admin', true)
       ON CONFLICT (lower(username)) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         display_name = EXCLUDED.display_name,
         role = 'admin',
         is_active = true`,
      [username, passwordHash, displayName],
    );
    console.info(
      JSON.stringify({
        event: "prototype-admin.seeded",
        username,
        passwordHashAlgorithm: "bcrypt",
      }),
    );
  } finally {
    await pool.end();
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      event: "prototype-admin.seed-failed",
      message: error instanceof Error ? error.message : "Seed failed.",
    }),
  );
  process.exitCode = 1;
});