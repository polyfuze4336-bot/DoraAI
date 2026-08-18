import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  DoraAlertEngine,
  type AlertCandidate,
  type DoraAlert,
} from "@dora/intelligence";
import { z } from "zod";

import { readJsonState, writeJsonState } from "@/lib/json-state";
import {
  AdminAuthorizationError,
  requireAdmin,
} from "@/lib/admin-authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const acknowledgeSchema = z.object({
  alertId: z.string().uuid(),
  acknowledgedBy: z.string().trim().min(1).max(200),
});

export async function GET() {
  const { path, alerts } = await alertState();
  if (!alerts.length) {
    const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
    const candidates = JSON.parse(
      await readFile(
        resolve(root, "config/demo-alert-candidates.json"),
        "utf8",
      ),
    ) as AlertCandidate[];
    const engine = new DoraAlertEngine();
    const seeded: DoraAlert[] = [];
    for (const candidate of candidates) {
      const result = engine.evaluate(candidate, seeded);
      if (result.alert) seeded.push(result.alert);
    }
    await writeJsonState(path, seeded);
    return Response.json({ alerts: seeded, source: "seeded-demo-alerts" });
  }
  return Response.json({ alerts, source: "local-alert-store" });
}

export async function PATCH(request: Request) {
  try {
    requireAdmin(request.headers);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  const input = acknowledgeSchema.parse(await request.json());
  const { path, alerts } = await alertState();
  const index = alerts.findIndex((alert) => alert.alertId === input.alertId);
  if (index < 0)
    return Response.json({ error: "Alert not found." }, { status: 404 });
  const updated = new DoraAlertEngine().acknowledge(
    alerts[index]!,
    input.acknowledgedBy,
  );
  alerts[index] = updated;
  await writeJsonState(path, alerts);
  return Response.json({ alert: updated });
}

async function alertState() {
  const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
  const path = resolve(
    root,
    process.env.DORA_ALERT_PATH ?? ".dora-data/alerts.json",
  );
  const alerts = await readJsonState<DoraAlert[]>(path, []);
  return { path, alerts };
}
