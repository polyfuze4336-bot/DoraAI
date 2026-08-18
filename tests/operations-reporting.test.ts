import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  AzureCommunicationEmailSender,
  generateWeeklyBrief,
  LocalReportRepository,
} from "@dora/reporting";
import { JsonFileIngestionStore } from "@dora/pipeline/ingestion-store";
import {
  describeLogicalSchedule,
  loadScheduleConfiguration,
} from "@dora/pipeline/schedules";
import { isScheduleDue } from "@dora/pipeline/scheduled-processing";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("configuration-owned processing schedules", () => {
  it("exposes Monday 08:00 in the configured timezone", () => {
    const configuration = loadScheduleConfiguration({
      DORA_ROOT: process.cwd(),
    });
    const brief = configuration.jobs.find(
      (job) => job.id === "monday-management-brief",
    );
    expect(configuration.timezone).toBe("Asia/Kuala_Lumpur");
    expect(
      describeLogicalSchedule(brief!.schedule, configuration.timezone),
    ).toBe("Monday at 08:00 Asia/Kuala_Lumpur");
    expect(configuration.containerAppsDispatcher.cron).toBe("*/30 * * * *");
  });

  it("runs weekly work once after Monday 08:00 in local time", () => {
    const schedule = {
      type: "weekly" as const,
      day: "Monday" as const,
      localTime: "08:00",
    };
    const mondayAtEightMalaysia = new Date("2026-08-17T00:00:00.000Z");
    expect(
      isScheduleDue(schedule, "Asia/Kuala_Lumpur", mondayAtEightMalaysia),
    ).toBe(true);
    expect(
      isScheduleDue(
        schedule,
        "Asia/Kuala_Lumpur",
        mondayAtEightMalaysia,
        "2026-08-17T00:00:00.000Z",
      ),
    ).toBe(false);
  });
});

describe("Monday management brief", () => {
  it("generates escaped responsive HTML and persists history", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dora-reports-"));
    directories.push(directory);
    const report = generateWeeklyBrief(
      {
        asOf: "2026-08-17T00:00:00.000Z",
        executiveSummary: ["Point <one>", "Point two"],
        marketOutlook: ["Firm"],
        majorCommodityMoves: ["Brent +3%"],
        keyDrivers: ["Supply"],
        emergingRisks: ["Shipping"],
        manufacturingSignals: ["Utilization stable"],
        forecastChanges: ["30-day higher"],
        managementActions: ["Review cover"],
        watchlist: ["Inventory"],
        confidenceAndDataQuality: ["Prototype data"],
      },
      "Asia/Kuala_Lumpur",
      "2026-08-17T00:00:00.000Z",
    );
    const repository = new LocalReportRepository(directory);
    await repository.save(report);
    expect(report.html).toContain("DORA Weekly Commodity Intelligence Brief");
    expect(report.html).toContain("Point &lt;one&gt;");
    expect(await repository.get(report.reportId)).toMatchObject({
      reportId: report.reportId,
      deliveryStatus: "not-sent",
    });
  });

  it("does not pretend email was sent without ACS configuration", async () => {
    const report = generateWeeklyBrief(
      {
        asOf: "2026-08-17T00:00:00.000Z",
        executiveSummary: [],
        marketOutlook: [],
        majorCommodityMoves: [],
        keyDrivers: [],
        emergingRisks: [],
        manufacturingSignals: [],
        forecastChanges: [],
        managementActions: [],
        watchlist: [],
        confidenceAndDataQuality: [],
      },
      "Asia/Kuala_Lumpur",
    );
    await expect(
      new AzureCommunicationEmailSender({}).send({
        report,
        recipients: ["test@example.invalid"],
      }),
    ).resolves.toEqual({ status: "awaiting-configuration" });
  });
});

describe("local ingestion run audit", () => {
  it("persists provider, counts, outcome, error and next run", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dora-runs-"));
    directories.push(directory);
    const store = new JsonFileIngestionStore(directory);
    await store.writeRunRecord!({
      runId: "run-1",
      providerId: "provider-1",
      startedAt: "2026-08-17T00:00:00.000Z",
      completedAt: "2026-08-17T00:01:00.000Z",
      status: "failed",
      fetchedRecords: 0,
      normalizedRecords: 0,
      signalRecords: 0,
      success: false,
      error: "Source unavailable",
      nextRunAt: "2026-08-17T01:00:00.000Z",
    });
    const value = JSON.parse(
      (await readFile(join(directory, "ingestion-runs.jsonl"), "utf8")).trim(),
    );
    expect(value).toMatchObject({
      providerId: "provider-1",
      success: false,
      error: "Source unavailable",
      nextRunAt: "2026-08-17T01:00:00.000Z",
    });
  });
});
