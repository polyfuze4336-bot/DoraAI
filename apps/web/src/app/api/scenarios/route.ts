import { DeterministicScenarioEngine } from "@dora/intelligence";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scenarioSchema = z.object({
  brentPriceChangePercent: z.number().min(-30).max(30),
  manufacturingDemandChangePercent: z.number().min(-20).max(20),
  shippingDisruptionPercent: z.number().min(0).max(100),
  shippingDisruptionDurationDays: z.number().min(1).max(90),
  usdStrengthChangePercent: z.number().min(-15).max(15),
});

export async function POST(request: Request) {
  const variables = scenarioSchema.parse(await request.json());
  const result = new DeterministicScenarioEngine().calculate(variables, {
    brentPrice: 84.16,
    feedstockCostIndex: 100,
    freightCostIndex: 100,
    manufacturingDemandIndex: 100,
    inventoryDays: 18,
  });
  return Response.json({
    result,
    explanation: {
      mode: process.env.DORA_FOUNDRY_ENDPOINT
        ? "foundry-ready"
        : "deterministic",
      summary: buildSummary(result.changes),
      confidence: result.confidence,
      uncertainties: result.assumptions,
    },
  });
}

function buildSummary(changes: {
  readonly feedstockCostPercent: number;
  readonly freightCostPercent: number;
  readonly demandPercent: number;
  readonly inventoryDays: number;
}): string {
  return `DORA calculates feedstock costs ${signed(changes.feedstockCostPercent)}, freight ${signed(changes.freightCostPercent)}, manufacturing demand ${signed(changes.demandPercent)}, and inventory coverage ${signed(changes.inventoryDays, " days")}. These are deterministic sensitivities, not a market forecast.`;
}

function signed(value: number, suffix = "%"): string {
  return `${value >= 0 ? "+" : ""}${value}${suffix}`;
}
