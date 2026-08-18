import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import { readJsonState, writeJsonState } from "./json-state";

const secretName = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9-]{1,127}$/)
  .optional();

export const adminSettingsSchema = z.object({
  commodities: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        name: z.string().trim().min(1).max(160),
        enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(100),
  regions: z.array(z.string().trim().min(1).max(100)).min(1).max(100),
  providers: z.record(
    z.string(),
    z.object({
      enabled: z.boolean(),
      refreshMinutes: z.number().int().min(1).max(43_200),
      keyVaultSecretName: secretName,
    }),
  ),
  refreshSchedules: z.record(z.string(), z.number().int().min(1).max(43_200)),
  weeklyReportSchedule: z.object({
    day: z.enum([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]),
    localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    timezone: z.string().min(1).max(100),
  }),
  reportRecipients: z.array(z.email()).max(200),
  alertThresholds: z.object({
    priceMovementPercent: z.number().positive().max(100),
    forecastDirectionChange: z.boolean(),
    riskScore: z.number().min(0).max(1),
    anomalyZScore: z.number().positive().max(10),
    manufacturingUtilizationDropPercent: z.number().positive().max(100),
    confidenceDropPercent: z.number().positive().max(100),
  }),
  aiModels: z.object({
    fastDeployment: z.string().trim().min(1).max(100),
    reasoningDeployment: z.string().trim().min(1).max(100),
    embeddingDeployment: z.string().trim().min(1).max(100),
  }),
  forecastHorizons: z
    .array(z.union([z.literal(1), z.literal(7), z.literal(30), z.literal(90)]))
    .min(1),
  riskThresholds: z
    .object({
      medium: z.number().min(0).max(1),
      high: z.number().min(0).max(1),
      critical: z.number().min(0).max(1),
    })
    .refine(
      (value) => value.medium < value.high && value.high < value.critical,
      "Risk thresholds must increase from medium to critical.",
    ),
});

export type AdminSettings = z.infer<typeof adminSettingsSchema>;

export async function loadAdminSettings(): Promise<AdminSettings> {
  const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
  const defaults = adminSettingsSchema.parse(
    JSON.parse(
      await readFile(
        resolve(root, "config/admin-settings.defaults.json"),
        "utf8",
      ),
    ),
  );
  const path = settingsPath(root);
  return adminSettingsSchema.parse(await readJsonState(path, defaults));
}

export async function saveAdminSettings(
  value: unknown,
): Promise<AdminSettings> {
  const settings = adminSettingsSchema.parse(value);
  const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
  new Intl.DateTimeFormat("en", {
    timeZone: settings.weeklyReportSchedule.timezone,
  }).format(new Date());
  await writeJsonState(settingsPath(root), settings);
  await writeSourceOverrides(root, settings);
  return settings;
}

export function settingsPath(root: string): string {
  return resolve(
    root,
    process.env.DORA_ADMIN_SETTINGS_PATH ?? ".dora-data/admin-settings.json",
  );
}

async function writeSourceOverrides(
  root: string,
  settings: AdminSettings,
): Promise<void> {
  const path = resolve(
    root,
    process.env.SOURCE_ADMIN_STATE_PATH ?? ".dora-data/source-admin.json",
  );
  const current = await readJsonState<{
    overrides: Record<string, unknown>;
    runtime: Record<string, unknown>;
  }>(path, { overrides: {}, runtime: {} });
  const overrides = Object.fromEntries(
    Object.entries(settings.providers).map(([id, provider]) => [
      id,
      {
        ...(current.overrides[id] as object | undefined),
        enabled: provider.enabled,
        refreshMinutes: provider.refreshMinutes,
      },
    ]),
  );
  await writeJsonState(path, {
    overrides: { ...current.overrides, ...overrides },
    runtime: current.runtime,
  });
}
