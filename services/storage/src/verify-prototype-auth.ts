import { Pool } from "pg";

import { createPostgresPoolConfig } from "./postgres-store";
import { postgresConfigFromEnvironment } from "./runtime-state";

async function main(): Promise<void> {
  const config = postgresConfigFromEnvironment();
  const username = process.env.DORA_INITIAL_ADMIN_USERNAME?.trim();
  if (!config || !username) throw new Error("Auth verification configuration is missing.");
  const pool = new Pool(createPostgresPoolConfig(config));
  try {
    const result = await pool.query<{
      username: string;
      bcrypt_hash: boolean;
      hash_length: number;
      not_plaintext: boolean;
      role: string;
      is_active: boolean;
      login_recorded: boolean;
    }>(
      `SELECT username,
              password_hash LIKE '$2%' AS bcrypt_hash,
              length(password_hash) AS hash_length,
              password_hash != username AS not_plaintext,
              role,
              is_active,
              last_login_at IS NOT NULL AS login_recorded
       FROM users
       WHERE lower(username) = lower($1)`,
      [username],
    );
    if (!result.rows[0]) throw new Error("Prototype administrator was not found.");
    console.info(JSON.stringify(result.rows[0]));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Auth verification failed.");
  process.exitCode = 1;
});