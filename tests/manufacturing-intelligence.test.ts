import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { calculateManufacturingOutlookInfluence } from "@dora/intelligence";
import { LocalSqliteManufacturingStore } from "@dora/storage/local-sqlite-store";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("manufacturing application database", () => {
  it("seeds and retrieves demo records from persistent SQLite", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dora-manufacturing-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "dora.db");
    const seedPath = resolve("config/demo-manufacturing-records.json");
    const store = await LocalSqliteManufacturingStore.open(
      databasePath,
      seedPath,
    );
    const firstRead = await store.listManufacturingStatus();
    store.close();
    const reopened = await LocalSqliteManufacturingStore.open(
      databasePath,
      seedPath,
    );
    const secondRead = await reopened.listManufacturingStatus({
      region: "Europe",
    });
    reopened.close();

    expect(firstRead.length).toBeGreaterThan(0);
    expect(
      firstRead.every((record) => record.dataOrigin === "seeded-demo"),
    ).toBe(true);
    expect(secondRead.every((record) => record.region === "Europe")).toBe(true);
    expect((await readFile(databasePath)).byteLength).toBeGreaterThan(0);
  });

  it("calculates manufacturing outlook influence deterministically", async () => {
    const records = JSON.parse(
      await readFile(resolve("config/demo-manufacturing-records.json"), "utf8"),
    );
    const influence = calculateManufacturingOutlookInfluence(records);

    expect(influence.score).toBeTypeOf("number");
    expect(["supportive", "neutral", "softening"]).toContain(
      influence.direction,
    );
    expect(influence.confidence).toBeLessThanOrEqual(0.6);
    expect(influence.supportingRecordIds).toHaveLength(records.length);
  });
});
