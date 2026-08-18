export const riskCategories = [
  "Geopolitical",
  "Supply disruption",
  "Demand shock",
  "Manufacturing slowdown",
  "Weather",
  "Shipping",
  "Inventory",
  "FX",
  "Policy",
  "Trade",
  "Economic",
  "Energy",
] as const;

export type RiskCategory = (typeof riskCategories)[number];
export type RiskStatus = "watching" | "active" | "escalated" | "closed";

export interface RiskScoringInput {
  readonly riskId: string;
  readonly title: string;
  readonly description: string;
  readonly category: RiskCategory;
  readonly commodity: string;
  readonly region: string;
  readonly baseLikelihood: number;
  readonly signalStrength: number;
  readonly sourceAgreement: number;
  readonly exposure: number;
  readonly impactSeverity: number;
  readonly velocityIndicator: number;
  readonly dataConfidence: number;
  readonly firstDetected: string;
  readonly lastUpdated: string;
  readonly status: RiskStatus;
  readonly supportingSignals: readonly string[];
  readonly evidence: readonly {
    readonly id: string;
    readonly label: string;
    readonly sourceUrl?: string;
  }[];
  readonly managementImplication: string;
}

export interface ScoredRisk {
  readonly riskId: string;
  readonly title: string;
  readonly description: string;
  readonly category: RiskCategory;
  readonly commodity: string;
  readonly region: string;
  readonly probability: number;
  readonly impact: number;
  readonly velocity: number;
  readonly confidence: number;
  readonly score: number;
  readonly level: "low" | "medium" | "high" | "critical";
  readonly firstDetected: string;
  readonly lastUpdated: string;
  readonly status: RiskStatus;
  readonly supportingSignals: readonly string[];
  readonly evidence: RiskScoringInput["evidence"];
  readonly managementImplication: string;
  readonly scoringBasis: readonly string[];
}

export class DeterministicRiskEngine {
  readonly version = "deterministic-risk-v1";

  score(input: RiskScoringInput): ScoredRisk {
    validate(input);
    const probability = clamp(
      input.baseLikelihood * 0.35 +
        input.signalStrength * 0.4 +
        input.sourceAgreement * 0.25,
    );
    const impact = clamp(input.impactSeverity * 0.65 + input.exposure * 0.35);
    const velocity = clamp(input.velocityIndicator);
    const confidence = clamp(
      input.dataConfidence * (0.65 + input.sourceAgreement * 0.35),
    );
    const score = clamp(
      probability * impact * (0.6 + velocity * 0.4) * confidence,
    );
    return {
      riskId: input.riskId,
      title: input.title,
      description: input.description,
      category: input.category,
      commodity: input.commodity,
      region: input.region,
      probability: round(probability),
      impact: round(impact),
      velocity: round(velocity),
      confidence: round(confidence),
      score: round(score),
      level:
        score >= 0.55
          ? "critical"
          : score >= 0.35
            ? "high"
            : score >= 0.18
              ? "medium"
              : "low",
      firstDetected: input.firstDetected,
      lastUpdated: input.lastUpdated,
      status: input.status,
      supportingSignals: input.supportingSignals,
      evidence: input.evidence,
      managementImplication: input.managementImplication,
      scoringBasis: [
        "Probability = 35% base likelihood + 40% signal strength + 25% source agreement.",
        "Impact = 65% severity + 35% DORA portfolio exposure.",
        "Velocity adjusts urgency; confidence discounts incomplete or conflicting evidence.",
      ],
    };
  }

  scoreAll(inputs: readonly RiskScoringInput[]): readonly ScoredRisk[] {
    return inputs
      .map((input) => this.score(input))
      .sort((left, right) => right.score - left.score);
  }
}

function validate(input: RiskScoringInput): void {
  for (const [name, value] of Object.entries({
    baseLikelihood: input.baseLikelihood,
    signalStrength: input.signalStrength,
    sourceAgreement: input.sourceAgreement,
    exposure: input.exposure,
    impactSeverity: input.impactSeverity,
    velocityIndicator: input.velocityIndicator,
    dataConfidence: input.dataConfidence,
  })) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`${name} must be between 0 and 1.`);
    }
  }
  if (!input.riskId || !input.title || !input.supportingSignals.length) {
    throw new Error("Risk ID, title, and supporting signals are required.");
  }
}

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function round(value: number): number {
  return Number(value.toFixed(4));
}
