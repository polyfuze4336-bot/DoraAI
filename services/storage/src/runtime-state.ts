import { DefaultAzureCredential, type TokenCredential } from "@azure/identity";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Pool } from "pg";

import {
  createPostgresPoolConfig,
  type PostgresStoreConfig,
} from "./postgres-store";

export interface RuntimeStateStore {
  read<T>(key: string, fallback: T): Promise<T>;
  write(key: string, value: unknown): Promise<void>;
  close?(): Promise<void>;
}

export class FileRuntimeStateStore implements RuntimeStateStore {
  constructor(private readonly rootDirectory: string) {}

  async read<T>(key: string, fallback: T): Promise<T> {
    try {
      return JSON.parse(await readFile(this.path(key), "utf8")) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
      throw error;
    }
  }

  async write(key: string, value: unknown): Promise<void> {
    const path = this.path(key);
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, path);
  }

  private path(key: string): string {
    const segments = key
      .split("/")
      .map((segment) => segment.replaceAll(/[^a-zA-Z0-9._-]/g, "-"));
    return resolve(this.rootDirectory, ...segments) + ".json";
  }
}

export class PostgresRuntimeStateStore implements RuntimeStateStore {
  readonly #pool: Pool;

  constructor(
    config: PostgresStoreConfig,
    credential: TokenCredential = new DefaultAzureCredential(),
  ) {
    this.#pool = new Pool(createPostgresPoolConfig(config, credential));
  }

  async read<T>(key: string, fallback: T): Promise<T> {
    const result = await this.#pool.query<{ value: T }>(
      "SELECT value FROM runtime_state WHERE state_key = $1",
      [key],
    );
    return result.rows[0]?.value ?? fallback;
  }

  async write(key: string, value: unknown): Promise<void> {
    await this.#pool.query(
      `INSERT INTO runtime_state (state_key, value, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (state_key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value)],
    );
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }
}

export function postgresConfigFromEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): PostgresStoreConfig | null {
  const host = environment.PGHOST?.trim();
  const database = environment.PGDATABASE?.trim();
  const user = environment.PGUSER?.trim();
  if (!host || !database || !user) return null;
  return {
    host,
    database,
    user,
    port: Number(environment.PGPORT ?? 5432),
    password: environment.PGPASSWORD,
    useEntraIdentity: environment.PG_USE_ENTRA_IDENTITY !== "false",
    ssl: environment.PGSSL !== "false",
  };
}
