import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  parseProviderDefinitions,
  type ProviderDefinition,
} from "@dora/connectors";
import { loadSharedConfig, type SharedConfig } from "@dora/shared";
import { z } from "zod";

const booleanFromEnvironment = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  return value.toLowerCase() === "true";
}, z.boolean());

const pipelineEnvironmentSchema = z.object({
  DORA_ROOT: z.string().optional(),
  PROVIDER_CONFIG_PATH: z.string().default("config/providers.json"),
  PROVIDER_CONFIG_JSON: z.string().optional(),
  INGESTION_OUTPUT_DIR: z.string().default("data/ingested"),
  PROVIDER_FORCE_REFRESH: booleanFromEnvironment.default(false),
  PROVIDER_FILTER_IDS: z.string().optional(),
  SOURCE_ADMIN_STATE_PATH: z.string().default(".dora-data/source-admin.json"),
});

export interface PipelineConfig {
  readonly shared: SharedConfig;
  readonly providers: readonly ProviderDefinition[];
  readonly ingestionOutputDirectory: string;
  readonly forceRefresh: boolean;
  readonly providerFilterIds: readonly string[];
}

export function loadPipelineConfig(
  environment: Record<string, string | undefined> = process.env,
): PipelineConfig {
  const shared = loadSharedConfig(environment);
  const parsed = pipelineEnvironmentSchema.parse(environment);
  const rootDirectory =
    parsed.DORA_ROOT ??
    environment.INIT_CWD ??
    process.env.INIT_CWD ??
    process.cwd();
  const providerConfigPath = resolve(
    rootDirectory,
    parsed.PROVIDER_CONFIG_PATH,
  );
  const rawDefinitions = parsed.PROVIDER_CONFIG_JSON
    ? parseJson(parsed.PROVIDER_CONFIG_JSON, "PROVIDER_CONFIG_JSON")
    : parseJson(readFileSync(providerConfigPath, "utf8"), providerConfigPath);

  const overridesPath = resolve(rootDirectory, parsed.SOURCE_ADMIN_STATE_PATH);
  const overrides = existsSync(overridesPath)
    ? readSourceOverrides(overridesPath)
    : {};
  const providerDefinitions = parseProviderDefinitions(rawDefinitions).map(
    (definition) => {
      const override = overrides[definition.id];
      return override
        ? {
            ...definition,
            enabled: override.enabled ?? definition.enabled,
            refreshMinutes:
              override.refreshMinutes ?? definition.refreshMinutes,
          }
        : definition;
    },
  );

  return {
    shared,
    providers: providerDefinitions.filter(
      (definition) =>
        !parsed.PROVIDER_FILTER_IDS ||
        parsed.PROVIDER_FILTER_IDS.split(",")
          .map((item) => item.trim())
          .includes(definition.id),
    ),
    ingestionOutputDirectory: resolve(
      rootDirectory,
      parsed.INGESTION_OUTPUT_DIR,
    ),
    forceRefresh: parsed.PROVIDER_FORCE_REFRESH,
    providerFilterIds: parsed.PROVIDER_FILTER_IDS
      ? parsed.PROVIDER_FILTER_IDS.split(",").map((item) => item.trim())
      : [],
  };
}

function readSourceOverrides(
  path: string,
): Record<string, { enabled?: boolean; refreshMinutes?: number }> {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    overrides?: Record<string, { enabled?: boolean; refreshMinutes?: number }>;
  };
  return parsed.overrides ?? {};
}

function parseJson(value: string, source: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(
      `${source} must contain valid provider configuration JSON.`,
    );
  }
}
