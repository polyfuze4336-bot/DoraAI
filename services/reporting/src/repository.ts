import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { WeeklyBrief } from "./contracts";

export interface ReportRepository {
  save(report: WeeklyBrief): Promise<void>;
  list(): Promise<readonly WeeklyBrief[]>;
  get(reportId: string): Promise<WeeklyBrief | undefined>;
}

export class LocalReportRepository implements ReportRepository {
  readonly #indexPath: string;
  constructor(private readonly rootDirectory: string) {
    this.#indexPath = join(rootDirectory, "reports.json");
  }

  async save(report: WeeklyBrief): Promise<void> {
    const reports = await this.list();
    const updated = [
      report,
      ...reports.filter((item) => item.reportId !== report.reportId),
    ];
    await mkdir(this.rootDirectory, { recursive: true });
    await writeFile(
      join(this.rootDirectory, `${report.reportId}.html`),
      report.html,
      "utf8",
    );
    await writeAtomically(this.#indexPath, updated);
  }

  async list(): Promise<readonly WeeklyBrief[]> {
    try {
      return JSON.parse(
        await readFile(this.#indexPath, "utf8"),
      ) as WeeklyBrief[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async get(reportId: string): Promise<WeeklyBrief | undefined> {
    return (await this.list()).find((item) => item.reportId === reportId);
  }
}

async function writeAtomically(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}
