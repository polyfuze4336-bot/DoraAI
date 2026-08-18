import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  DeterministicRiskEngine,
  type RiskScoringInput,
} from "@dora/intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
  const path = resolve(root, "config/demo-risk-inputs.json");
  const inputs = JSON.parse(await readFile(path, "utf8")) as RiskScoringInput[];
  const engine = new DeterministicRiskEngine();
  return Response.json({
    source: "seeded-demo-risk-inputs",
    scoringModel: engine.version,
    aiExplanationStatus: process.env.DORA_FOUNDRY_ENDPOINT
      ? "available-on-request"
      : "awaiting-foundry-configuration",
    risks: engine.scoreAll(inputs),
    generatedAt: new Date().toISOString(),
  });
}
