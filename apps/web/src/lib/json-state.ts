import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";

import {
  PostgresRuntimeStateStore,
  postgresConfigFromEnvironment,
  type RuntimeStateStore,
} from "@dora/storage";

let productionStore: RuntimeStateStore | undefined;

export async function readJsonState<T>(path: string, fallback: T): Promise<T> {
  const store = runtimeStateStore();
  if (store) return store.read(stateKey(path), fallback);
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJsonState(
  path: string,
  value: unknown,
): Promise<void> {
  const store = runtimeStateStore();
  if (store) return store.write(stateKey(path), value);
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

function runtimeStateStore(): RuntimeStateStore | undefined {
  if (productionStore) return productionStore;
  const config = postgresConfigFromEnvironment();
  if (config) {
    productionStore = new PostgresRuntimeStateStore(config);
    return productionStore;
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.DORA_ALLOW_LOCAL_STATE !== "true"
  ) {
    throw new Error("PostgreSQL runtime state is required in production.");
  }
  return undefined;
}

function stateKey(path: string): string {
  return `web:${basename(path)}`;
}
