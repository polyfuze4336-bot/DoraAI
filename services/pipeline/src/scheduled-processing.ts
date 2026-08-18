import { resolve } from "node:path";

import {
  AzureCommunicationEmailSender,
  createPrototypeWeeklyBriefContent,
  generateWeeklyBrief,
  type ReportRepository,
  type WeeklyBrief,
} from "@dora/reporting";
import {
  FileRuntimeStateStore,
  PostgresRuntimeStateStore,
  postgresConfigFromEnvironment,
  type RuntimeStateStore,
} from "@dora/storage";

import { runPipeline, type PipelineRunSummary } from "./pipeline";
import {
  applyAdminScheduleOverrides,
  loadScheduleConfiguration,
  type ScheduleAdminOverrides,
  type ScheduleConfiguration,
} from "./schedules";

interface ScheduleState {
  readonly jobs: Record<
    string,
    {
      readonly lastRunAt: string;
      readonly status: "completed" | "failed";
      readonly error?: string;
    }
  >;
}

export interface ScheduledProcessingResult {
  readonly checkedAt: string;
  readonly timezone: string;
  readonly dueJobs: readonly string[];
  readonly completedJobs: readonly string[];
  readonly failedJobs: readonly {
    readonly jobId: string;
    readonly error: string;
  }[];
  readonly pipelineSummary?: PipelineRunSummary;
}

export async function runScheduledProcessing(
  environment: Record<string, string | undefined> = process.env,
  now = new Date(),
  correlationId = crypto.randomUUID(),
): Promise<ScheduledProcessingResult> {
  const root = environment.DORA_ROOT ?? environment.INIT_CWD ?? process.cwd();
  const stateStore = createRuntimeStateStore(environment, root);
  const admin = await stateStore.read<ScheduleAdminOverrides | undefined>(
    "web:admin-settings.json",
    undefined,
  );
  const configuration = applyAdminScheduleOverrides(
    loadScheduleConfiguration(environment),
    admin,
  );
  const state = await stateStore.read<ScheduleState>("pipeline:schedule", {
    jobs: {},
  });
  const dueJobs = configuration.jobs.filter(
    (job) =>
      job.enabled &&
      isScheduleDue(
        job.schedule,
        configuration.timezone,
        now,
        state.jobs[job.id]?.lastRunAt,
      ),
  );
  const completedJobs: string[] = [];
  const failedJobs: { jobId: string; error: string }[] = [];
  let pipelineSummary: PipelineRunSummary | undefined;
  const ingestionJobs = new Set([
    "commodity-prices",
    "news",
    "market-intelligence",
    "manufacturing",
  ]);
  if (dueJobs.some((job) => ingestionJobs.has(job.id))) {
    pipelineSummary = await runPipeline({
      ...environment,
      DORA_PARENT_CORRELATION_ID: correlationId,
    });
  }

  for (const job of dueJobs) {
    try {
      if (job.id === "daily-synthesis") {
        const summary =
          pipelineSummary ??
          (await runPipeline({
            ...environment,
            DORA_PARENT_CORRELATION_ID: correlationId,
          }));
        await writeSynthesisSnapshot(stateStore, now, summary);
        pipelineSummary = summary;
      }
      if (job.id === "monday-management-brief") {
        await generateAndDeliverBrief(
          stateStore,
          environment,
          configuration.timezone,
          now,
        );
      }
      state.jobs[job.id] = {
        lastRunAt: now.toISOString(),
        status: "completed",
      };
      completedJobs.push(job.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Scheduled job failed.";
      state.jobs[job.id] = {
        lastRunAt: now.toISOString(),
        status: "failed",
        error: message,
      };
      failedJobs.push({ jobId: job.id, error: message });
    }
  }
  await stateStore.write("pipeline:schedule", state);
  return {
    checkedAt: now.toISOString(),
    timezone: configuration.timezone,
    dueJobs: dueJobs.map((job) => job.id),
    completedJobs,
    failedJobs,
    pipelineSummary,
  };
}

export function isScheduleDue(
  schedule: ScheduleConfiguration["jobs"][number]["schedule"],
  timezone: string,
  now: Date,
  lastRunAt?: string,
): boolean {
  if (schedule.type === "interval") {
    return (
      !lastRunAt ||
      now.getTime() - Date.parse(lastRunAt) >= schedule.minutes * 60_000
    );
  }
  if (schedule.type === "source-refresh") return true;
  const current = localParts(now, timezone);
  const last = lastRunAt
    ? localParts(new Date(lastRunAt), timezone)
    : undefined;
  const [hour, minute] = schedule.localTime.split(":").map(Number);
  const timeReached =
    current.hour > (hour ?? 0) ||
    (current.hour === hour && current.minute >= (minute ?? 0));
  const ranToday = last?.date === current.date;
  if (schedule.type === "daily") return timeReached && !ranToday;
  return current.weekday === schedule.day && timeReached && !ranToday;
}

async function generateAndDeliverBrief(
  stateStore: RuntimeStateStore,
  environment: Record<string, string | undefined>,
  timezone: string,
  now: Date,
): Promise<void> {
  const repository = runtimeReportRepository(stateStore);
  let report = generateWeeklyBrief(
    createPrototypeWeeklyBriefContent(now.toISOString()),
    timezone,
    now.toISOString(),
  );
  const recipients = (environment.DORA_REPORT_RECIPIENTS ?? "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (recipients.length) {
    const delivery = await new AzureCommunicationEmailSender({
      endpoint: environment.AZURE_COMMUNICATION_EMAIL_ENDPOINT,
      senderAddress: environment.DORA_REPORT_SENDER_ADDRESS,
      connectionString:
        environment.AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING,
    }).send({ report, recipients });
    report = {
      ...report,
      deliveryStatus:
        delivery.status === "sent" ? "sent" : "awaiting-email-configuration",
      recipients,
      deliveryMessageId: delivery.messageId,
      sentAt: delivery.status === "sent" ? now.toISOString() : undefined,
    };
  }
  await repository.save(report);
}

async function writeSynthesisSnapshot(
  stateStore: RuntimeStateStore,
  now: Date,
  summary: PipelineRunSummary,
): Promise<void> {
  await stateStore.write(
    `pipeline:synthesis/${now.toISOString().slice(0, 10)}`,
    {
      generatedAt: now.toISOString(),
      classification: "CALCULATION",
      method: "daily-pipeline-synthesis-v1",
      summary,
    },
  );
}

function localParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function createRuntimeStateStore(
  environment: Readonly<Record<string, string | undefined>>,
  root: string,
): RuntimeStateStore {
  const postgres = postgresConfigFromEnvironment(environment);
  if (postgres) return new PostgresRuntimeStateStore(postgres);
  if ((environment.NODE_ENV ?? process.env.NODE_ENV) === "production") {
    throw new Error("PostgreSQL runtime state is required in production.");
  }
  return new FileRuntimeStateStore(resolve(root, ".dora-data/runtime-state"));
}

function runtimeReportRepository(
  stateStore: RuntimeStateStore,
): ReportRepository {
  const key = "shared:reports";
  return {
    async save(report) {
      const reports = await this.list();
      await stateStore.write(key, [
        report,
        ...reports.filter((item) => item.reportId !== report.reportId),
      ]);
    },
    list: () => stateStore.read<WeeklyBrief[]>(key, []),
    async get(reportId) {
      return (await this.list()).find((item) => item.reportId === reportId);
    },
  };
}
