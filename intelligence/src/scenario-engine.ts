export interface ScenarioVariables {
  readonly brentPriceChangePercent: number;
  readonly manufacturingDemandChangePercent: number;
  readonly shippingDisruptionPercent: number;
  readonly shippingDisruptionDurationDays: number;
  readonly usdStrengthChangePercent: number;
}

export interface ScenarioBaseline {
  readonly brentPrice: number;
  readonly feedstockCostIndex: number;
  readonly freightCostIndex: number;
  readonly manufacturingDemandIndex: number;
  readonly inventoryDays: number;
}

export interface ScenarioResult {
  readonly scenarioId: string;
  readonly variables: ScenarioVariables;
  readonly baseline: ScenarioBaseline;
  readonly calculated: {
    readonly brentPrice: number;
    readonly feedstockCostIndex: number;
    readonly freightCostIndex: number;
    readonly manufacturingDemandIndex: number;
    readonly inventoryDays: number;
  };
  readonly changes: {
    readonly feedstockCostPercent: number;
    readonly freightCostPercent: number;
    readonly demandPercent: number;
    readonly inventoryDays: number;
  };
  readonly commodityImplications: readonly string[];
  readonly operationalImplications: readonly string[];
  readonly risks: readonly string[];
  readonly confidence: number;
  readonly assumptions: readonly string[];
  readonly generatedAt: string;
  readonly model: "deterministic-sensitivity-v1";
}

export class DeterministicScenarioEngine {
  calculate(
    variables: ScenarioVariables,
    baseline: ScenarioBaseline,
  ): ScenarioResult {
    validateVariables(variables);
    const brentPrice =
      baseline.brentPrice * (1 + variables.brentPriceChangePercent / 100);
    const disruptionDurationFactor = Math.max(
      variables.shippingDisruptionDurationDays / 30,
      0.25,
    );
    const freightCostPercent =
      variables.shippingDisruptionPercent * 0.42 * disruptionDurationFactor +
      variables.brentPriceChangePercent * 0.12;
    const feedstockCostPercent =
      variables.brentPriceChangePercent * 0.63 +
      variables.usdStrengthChangePercent * 0.28 +
      variables.shippingDisruptionPercent * 0.09;
    const inventoryDaysChange =
      -variables.shippingDisruptionPercent * 0.08 * disruptionDurationFactor -
      Math.max(variables.manufacturingDemandChangePercent, 0) * 0.05;
    const confidence = clamp(
      0.82 -
        Math.abs(variables.brentPriceChangePercent) * 0.006 -
        Math.abs(variables.shippingDisruptionPercent) * 0.008 -
        Math.abs(variables.usdStrengthChangePercent) * 0.005,
      0.35,
      0.82,
    );
    return {
      scenarioId: crypto.randomUUID(),
      variables,
      baseline,
      calculated: {
        brentPrice: round(brentPrice),
        feedstockCostIndex: round(
          baseline.feedstockCostIndex * (1 + feedstockCostPercent / 100),
        ),
        freightCostIndex: round(
          baseline.freightCostIndex * (1 + freightCostPercent / 100),
        ),
        manufacturingDemandIndex: round(
          baseline.manufacturingDemandIndex *
            (1 + variables.manufacturingDemandChangePercent / 100),
        ),
        inventoryDays: round(
          Math.max(0, baseline.inventoryDays + inventoryDaysChange),
        ),
      },
      changes: {
        feedstockCostPercent: round(feedstockCostPercent),
        freightCostPercent: round(freightCostPercent),
        demandPercent: round(variables.manufacturingDemandChangePercent),
        inventoryDays: round(inventoryDaysChange),
      },
      commodityImplications: buildCommodityImplications(
        variables,
        feedstockCostPercent,
      ),
      operationalImplications: buildOperationalImplications(
        variables,
        inventoryDaysChange,
      ),
      risks: buildRisks(variables),
      confidence: round(confidence),
      assumptions: [
        "Elasticities are transparent prototype sensitivities, not estimated causal effects.",
        "Variables are applied simultaneously and second-order market responses are excluded.",
        "No supplier contract, hedge, tax, substitution or currency-basis detail is modeled.",
      ],
      generatedAt: new Date().toISOString(),
      model: "deterministic-sensitivity-v1",
    };
  }
}

function validateVariables(variables: ScenarioVariables): void {
  const ranges: Record<keyof ScenarioVariables, readonly [number, number]> = {
    brentPriceChangePercent: [-30, 30],
    manufacturingDemandChangePercent: [-20, 20],
    shippingDisruptionPercent: [0, 100],
    shippingDisruptionDurationDays: [1, 90],
    usdStrengthChangePercent: [-15, 15],
  };
  for (const [key, range] of Object.entries(ranges) as [
    keyof ScenarioVariables,
    readonly [number, number],
  ][]) {
    const value = variables[key];
    if (!Number.isFinite(value) || value < range[0] || value > range[1]) {
      throw new Error(`${key} must be between ${range[0]} and ${range[1]}.`);
    }
  }
}

function buildCommodityImplications(
  variables: ScenarioVariables,
  feedstockCostPercent: number,
): readonly string[] {
  return [
    `Modeled Brent changes ${signed(variables.brentPriceChangePercent)}.`,
    `Combined feedstock cost sensitivity is ${signed(feedstockCostPercent)}.`,
    variables.usdStrengthChangePercent > 0
      ? "A stronger USD adds local-currency commodity pressure."
      : "USD movement does not add upward pressure in this scenario.",
  ];
}

function buildOperationalImplications(
  variables: ScenarioVariables,
  inventoryDaysChange: number,
): readonly string[] {
  return [
    `Manufacturing demand changes ${signed(variables.manufacturingDemandChangePercent)}.`,
    `Inventory coverage changes ${signed(inventoryDaysChange, " days")}.`,
    variables.shippingDisruptionPercent >= 40
      ? "Route contingency and supplier allocation require management review."
      : "No severe route constraint is assumed.",
  ];
}

function buildRisks(variables: ScenarioVariables): readonly string[] {
  return [
    ...(variables.shippingDisruptionPercent >= 30
      ? ["Shipping lead-time and freight premium escalation"]
      : []),
    ...(variables.brentPriceChangePercent >= 10
      ? ["Feedstock cost threshold breach"]
      : []),
    ...(variables.manufacturingDemandChangePercent <= -5
      ? ["Inventory overhang from weaker manufacturing demand"]
      : []),
    ...(variables.usdStrengthChangePercent >= 5
      ? ["Local-currency purchasing pressure"]
      : []),
  ];
}

function signed(value: number, suffix = "%"): string {
  return `${value >= 0 ? "+" : ""}${round(value)}${suffix}`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
