import { resolve } from "node:path";

import {
  AzureCommunicationEmailSender,
  createPrototypeWeeklyBriefContent,
  generateWeeklyBrief,
  type ReportRepository,
  type WeeklyBrief,
} from "@dora/reporting";
import { loadAdminSettings } from "@/lib/admin-settings";
import { readJsonState, writeJsonState } from "@/lib/json-state";

export function reportRepository(): ReportRepository {
  const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
  const path = resolve(
    root,
    process.env.DORA_REPORT_PATH ?? ".dora-data/reports.json",
  );
  return {
    async save(report) {
      const reports = await this.list();
      await writeJsonState(path, [
        report,
        ...reports.filter((item) => item.reportId !== report.reportId),
      ]);
    },
    list: () => readJsonState<WeeklyBrief[]>(path, []),
    async get(reportId) {
      return (await this.list()).find((item) => item.reportId === reportId);
    },
  };
}

export async function ensureCurrentBrief(): Promise<WeeklyBrief> {
  const repository = reportRepository();
  const latest = (await repository.list())[0];
  if (latest) return latest;
  const report = await generateCurrentBrief();
  await repository.save(report);
  return report;
}

export async function generateCurrentBrief(): Promise<WeeklyBrief> {
  const settings = await loadAdminSettings();
  return generateWeeklyBrief(
    currentBriefContent(),
    settings.weeklyReportSchedule.timezone,
  );
}

export async function configuredRecipients(
  test: boolean,
): Promise<readonly string[]> {
  const settings = await loadAdminSettings();
  const value = test
    ? process.env.DORA_REPORT_TEST_RECIPIENTS
    : settings.reportRecipients.join(",") || process.env.DORA_REPORT_RECIPIENTS;
  return (value ?? "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function emailSender(): AzureCommunicationEmailSender {
  return new AzureCommunicationEmailSender({
    endpoint: process.env.AZURE_COMMUNICATION_EMAIL_ENDPOINT,
    senderAddress: process.env.DORA_REPORT_SENDER_ADDRESS,
    connectionString: process.env.AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING,
  });
}

function currentBriefContent() {
  return createPrototypeWeeklyBriefContent();
}
