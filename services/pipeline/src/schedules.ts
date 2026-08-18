import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

const scheduleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("interval"),
    minutes: z.number().int().positive(),
  }),
  z.object({ type: z.literal("source-refresh") }),
  z.object({
    type: z.literal("daily"),
    localTime: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  z.object({
    type: z.literal("weekly"),
    day: z.enum([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]),
    localTime: z.string().regex(/^\d{2}:\d{2}$/),
  }),
]);

const configurationSchema = z.object({
  timezone: z.string().min(1),
  containerAppsDispatcher: z.object({
    cron: z.string().min(1),
    description: z.string().min(1),
  }),
  jobs: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      enabled: z.boolean(),
      schedule: scheduleSchema,
      providerTypes: z.array(z.string()),
    }),
  ),
});

export type ScheduleConfiguration = z.infer<typeof configurationSchema>;
export interface ScheduleAdminOverrides {
  readonly refreshSchedules?: Record<string, number>;
  readonly weeklyReportSchedule?: {
    readonly day: string;
    readonly localTime: string;
    readonly timezone: string;
  };
}

export function loadScheduleConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ScheduleConfiguration {
  const root = environment.DORA_ROOT ?? environment.INIT_CWD ?? process.cwd();
  const path = resolve(
    root,
    environment.DORA_SCHEDULE_CONFIG_PATH ?? "config/schedules.json",
  );
  const parsed = configurationSchema.parse(
    JSON.parse(readFileSync(path, "utf8")) as unknown,
  );
  const adminPath = resolve(
    root,
    environment.DORA_ADMIN_SETTINGS_PATH ?? ".dora-data/admin-settings.json",
  );
  const admin = existsSync(adminPath)
    ? (JSON.parse(readFileSync(adminPath, "utf8")) as ScheduleAdminOverrides)
    : undefined;
  return applyAdminScheduleOverrides(parsed, admin);
}

export function applyAdminScheduleOverrides(
  parsed: ScheduleConfiguration,
  admin?: ScheduleAdminOverrides,
): ScheduleConfiguration {
  const merged = configurationSchema.parse({
    ...parsed,
    timezone: admin?.weeklyReportSchedule?.timezone ?? parsed.timezone,
    jobs: parsed.jobs.map((job) => {
      if (job.id === "monday-management-brief" && admin?.weeklyReportSchedule) {
        return {
          ...job,
          schedule: {
            type: "weekly",
            day: admin.weeklyReportSchedule.day,
            localTime: admin.weeklyReportSchedule.localTime,
          },
        };
      }
      const minutes = admin?.refreshSchedules?.[job.id];
      return minutes && job.schedule.type === "interval"
        ? { ...job, schedule: { type: "interval", minutes } }
        : job;
    }),
  });
  new Intl.DateTimeFormat("en", { timeZone: merged.timezone }).format(
    new Date(),
  );
  return merged;
}

export function describeLogicalSchedule(
  schedule: ScheduleConfiguration["jobs"][number]["schedule"],
  timezone: string,
): string {
  if (schedule.type === "interval") return `Every ${schedule.minutes} minutes`;
  if (schedule.type === "source-refresh")
    return "Based on source refresh configuration";
  if (schedule.type === "daily")
    return `Daily at ${schedule.localTime} ${timezone}`;
  return `${schedule.day} at ${schedule.localTime} ${timezone}`;
}
