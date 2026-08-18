import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  createConfiguredProviderRegistry,
  createEnterpriseAdaptersFromEnvironment,
  parseProviderDefinitions,
} from "@dora/connectors";
import { assessSourceQuality } from "@dora/intelligence";
import { runPipeline } from "@dora/pipeline";
import { z } from "zod";

import { readJsonState, writeJsonState } from "@/lib/json-state";
import {
  AdminAuthorizationError,
  requireAdmin,
} from "@/lib/admin-authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SourceAdminState {
  readonly overrides: Record<
    string,
    {
      enabled?: boolean;
      refreshMinutes?: number;
      configuredReliability?: number;
    }
  >;
  readonly runtime: Record<
    string,
    {
      lastRefresh?: string;
      nextRefresh?: string;
      records?: number;
      latencyMs?: number;
      errors?: number;
      lastError?: string;
    }
  >;
}

const actionSchema = z.object({
  action: z.enum(["test", "sync", "enable", "disable", "edit"]),
  sourceId: z.string().min(1),
  configuration: z
    .object({
      refreshMinutes: z.number().int().positive().max(43_200).optional(),
      configuredReliability: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export async function GET() {
  const { catalog, definitions, state } = await context();
  const definitionById = new Map(definitions.map((item) => [item.id, item]));
  const now = Date.now();
  const sources = catalog.map((source) => {
    const definition = definitionById.get(source.id);
    const override = state.overrides[source.id];
    const runtime = state.runtime[source.id];
    const enabled = override?.enabled ?? definition?.enabled ?? false;
    const refreshMinutes =
      override?.refreshMinutes ?? definition?.refreshMinutes ?? null;
    const lastRefresh = runtime?.lastRefresh;
    const ageMinutes = lastRefresh
      ? Math.max(0, (now - Date.parse(lastRefresh)) / 60_000)
      : null;
    const freshness =
      ageMinutes === null || refreshMinutes === null
        ? 0.35
        : Math.exp(-ageMinutes / Math.max(refreshMinutes, 1));
    const quality = assessSourceQuality({
      sourceId: source.id,
      configuredReliability:
        override?.configuredReliability ?? source.configuredReliability,
      freshness,
      completeness: runtime?.records ? 0.85 : 0.45,
      corroboration: source.commercial ? 0.8 : 0.65,
      historicalSignalQuality: source.commercial ? 0.9 : 0.7,
    });
    return {
      ...source,
      enabled,
      refreshMinutes,
      status: source.commercial
        ? "awaiting-commercial-configuration"
        : enabled
          ? runtime?.lastError
            ? "degraded"
            : "enabled"
          : "disabled",
      lastRefresh: runtime?.lastRefresh ?? null,
      nextRefresh: runtime?.nextRefresh ?? null,
      records: runtime?.records ?? 0,
      latencyMs: runtime?.latencyMs ?? null,
      errors: runtime?.errors ?? 0,
      freshness:
        ageMinutes === null
          ? "unknown"
          : ageMinutes <= (refreshMinutes ?? 0)
            ? "fresh"
            : "stale",
      quality,
    };
  });
  return Response.json({ sources, generatedAt: new Date().toISOString() });
}

export async function POST(request: Request) {
  try {
    requireAdmin(request.headers);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  const input = actionSchema.parse(await request.json());
  const { catalog, definitions, state, statePath } = await context();
  const source = catalog.find((item) => item.id === input.sourceId);
  if (!source)
    return Response.json({ error: "Source not found." }, { status: 404 });
  if (input.action === "enable" || input.action === "disable") {
    state.overrides[input.sourceId] = {
      ...state.overrides[input.sourceId],
      enabled: input.action === "enable",
    };
    await writeJsonState(statePath, state);
    return Response.json({
      status: input.action === "enable" ? "enabled" : "disabled",
    });
  }
  if (input.action === "edit") {
    state.overrides[input.sourceId] = {
      ...state.overrides[input.sourceId],
      ...input.configuration,
    };
    await writeJsonState(statePath, state);
    return Response.json({ status: "configuration-updated" });
  }
  if (source.commercial) {
    return Response.json({ status: "awaiting-commercial-configuration" });
  }
  const startedAt = Date.now();
  try {
    if (input.action === "test") {
      const health = await testConnection(input.sourceId, definitions);
      updateRuntime(state, input.sourceId, {
        latencyMs: Date.now() - startedAt,
        lastError: health.status === "healthy" ? undefined : health.message,
      });
      await writeJsonState(statePath, state);
      return Response.json({ health });
    }
    const summary = await runPipeline({
      ...process.env,
      PROVIDER_FILTER_IDS: input.sourceId,
      PROVIDER_FORCE_REFRESH: "true",
    });
    const result = summary.results[0];
    updateRuntime(state, input.sourceId, {
      lastRefresh: summary.completedAt,
      nextRefresh: nextRefresh(
        input.sourceId,
        definitions,
        summary.completedAt,
      ),
      records: result?.items ?? 0,
      latencyMs: Date.now() - startedAt,
      lastError: result?.error,
      errors:
        result?.status === "failed"
          ? (state.runtime[input.sourceId]?.errors ?? 0) + 1
          : (state.runtime[input.sourceId]?.errors ?? 0),
    });
    await writeJsonState(statePath, state);
    return Response.json({ summary });
  } catch (error) {
    updateRuntime(state, input.sourceId, {
      latencyMs: Date.now() - startedAt,
      lastError:
        error instanceof Error ? error.message : "Source action failed.",
      errors: (state.runtime[input.sourceId]?.errors ?? 0) + 1,
    });
    await writeJsonState(statePath, state);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Source action failed.",
      },
      { status: 502 },
    );
  }
}

async function context() {
  const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
  const catalog = JSON.parse(
    await readFile(resolve(root, "config/source-catalog.json"), "utf8"),
  ) as {
    id: string;
    name: string;
    type: string;
    authentication: string;
    configuredReliability: number;
    commercial: boolean;
  }[];
  const definitions = parseProviderDefinitions(
    JSON.parse(await readFile(resolve(root, "config/providers.json"), "utf8")),
  );
  const statePath = resolve(
    root,
    process.env.SOURCE_ADMIN_STATE_PATH ?? ".dora-data/source-admin.json",
  );
  const state = await readJsonState<SourceAdminState>(statePath, {
    overrides: {},
    runtime: {},
  });
  return { root, catalog, definitions, statePath, state };
}

async function testConnection(
  sourceId: string,
  definitions: ReturnType<typeof parseProviderDefinitions>,
) {
  const enterprise = createEnterpriseAdaptersFromEnvironment();
  const enterpriseAdapter = [
    enterprise.sharePoint,
    enterprise.databricks,
    enterprise.powerBi,
  ].find((item) => item.id === sourceId);
  if (enterpriseAdapter) return enterpriseAdapter.healthCheck();
  const definition = definitions.find((item) => item.id === sourceId);
  if (!definition) {
    return {
      providerId: sourceId,
      status: "not-configured" as const,
      checkedAt: new Date().toISOString(),
      message: "Source adapter is not configured.",
    };
  }
  const registry = createConfiguredProviderRegistry(
    [{ ...definition, enabled: true }],
    { environment: process.env },
  );
  return registry.registrations()[0]!.provider.healthCheck();
}

function updateRuntime(
  state: SourceAdminState,
  sourceId: string,
  value: SourceAdminState["runtime"][string],
) {
  state.runtime[sourceId] = { ...state.runtime[sourceId], ...value };
}

function nextRefresh(
  sourceId: string,
  definitions: ReturnType<typeof parseProviderDefinitions>,
  from: string,
): string | undefined {
  const minutes = definitions.find(
    (item) => item.id === sourceId,
  )?.refreshMinutes;
  return minutes
    ? new Date(Date.parse(from) + minutes * 60_000).toISOString()
    : undefined;
}
