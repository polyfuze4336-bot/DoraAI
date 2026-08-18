import type { RiskLevel, TrendDirection } from "@/components/design-system";

export interface CommandCommodity {
  readonly symbol: string;
  readonly name: string;
  readonly category: "Energy" | "Metals" | "Agriculture" | "Feedstocks";
  readonly price: number;
  readonly currency: string;
  readonly unit: string;
  readonly change24h: number;
  readonly change7d: number;
  readonly change30d: number;
  readonly trend: TrendDirection;
  readonly forecastDirection: "higher" | "lower" | "range-bound";
  readonly confidence: number;
}

export const commandCommodities: readonly CommandCommodity[] = [
  {
    symbol: "BRENT",
    name: "Brent crude",
    category: "Energy",
    price: 84.16,
    currency: "USD",
    unit: "bbl",
    change24h: 1.8,
    change7d: 3.6,
    change30d: 5.2,
    trend: "up",
    forecastDirection: "higher",
    confidence: 88,
  },
  {
    symbol: "WTI",
    name: "WTI crude",
    category: "Energy",
    price: 80.82,
    currency: "USD",
    unit: "bbl",
    change24h: 2.4,
    change7d: 4.1,
    change30d: 3.8,
    trend: "up",
    forecastDirection: "higher",
    confidence: 92,
  },
  {
    symbol: "NG",
    name: "Natural gas",
    category: "Energy",
    price: 2.91,
    currency: "USD",
    unit: "MMBtu",
    change24h: -1.1,
    change7d: 2.2,
    change30d: -4.8,
    trend: "flat",
    forecastDirection: "range-bound",
    confidence: 76,
  },
  {
    symbol: "LNG-P",
    name: "LNG proxy",
    category: "Energy",
    price: 12.74,
    currency: "USD",
    unit: "MMBtu",
    change24h: 0.7,
    change7d: 3.1,
    change30d: 6.6,
    trend: "up",
    forecastDirection: "higher",
    confidence: 71,
  },
  {
    symbol: "XAU",
    name: "Gold",
    category: "Metals",
    price: 2468,
    currency: "USD",
    unit: "oz",
    change24h: 0.4,
    change7d: 1.6,
    change30d: 4.3,
    trend: "up",
    forecastDirection: "higher",
    confidence: 83,
  },
  {
    symbol: "CU",
    name: "Copper",
    category: "Metals",
    price: 4.47,
    currency: "USD",
    unit: "lb",
    change24h: 0.8,
    change7d: -1.4,
    change30d: 2.1,
    trend: "flat",
    forecastDirection: "range-bound",
    confidence: 79,
  },
  {
    symbol: "AL",
    name: "Aluminium",
    category: "Metals",
    price: 2614,
    currency: "USD",
    unit: "tonne",
    change24h: 0.3,
    change7d: 1.1,
    change30d: 3.4,
    trend: "up",
    forecastDirection: "higher",
    confidence: 81,
  },
  {
    symbol: "NI",
    name: "Nickel",
    category: "Metals",
    price: 16240,
    currency: "USD",
    unit: "tonne",
    change24h: -0.6,
    change7d: -2.8,
    change30d: -5.7,
    trend: "down",
    forecastDirection: "lower",
    confidence: 78,
  },
  {
    symbol: "PALM",
    name: "Palm oil",
    category: "Agriculture",
    price: 3894,
    currency: "MYR",
    unit: "tonne",
    change24h: 0.5,
    change7d: 2.4,
    change30d: 1.9,
    trend: "up",
    forecastDirection: "range-bound",
    confidence: 73,
  },
  {
    symbol: "NAPHTHA",
    name: "Naphtha",
    category: "Feedstocks",
    price: 712,
    currency: "USD",
    unit: "tonne",
    change24h: 1.2,
    change7d: 3.8,
    change30d: 4.6,
    trend: "up",
    forecastDirection: "higher",
    confidence: 84,
  },
] as const;

export type OutlookHorizon = "24h" | "7d" | "30d" | "90d";

export const outlookHorizons = [
  {
    id: "24h",
    label: "24 hours",
    projected: 100.6,
    low: 98.7,
    high: 102.3,
    confidence: 72,
  },
  {
    id: "7d",
    label: "7 days",
    projected: 102.2,
    low: 96.4,
    high: 107.1,
    confidence: 78,
  },
  {
    id: "30d",
    label: "30 days",
    projected: 103.8,
    low: 91.8,
    high: 113.2,
    confidence: 69,
  },
  {
    id: "90d",
    label: "90 days",
    projected: 105.1,
    low: 83.4,
    high: 122.8,
    confidence: 58,
  },
] as const satisfies readonly {
  id: OutlookHorizon;
  label: string;
  projected: number;
  low: number;
  high: number;
  confidence: number;
}[];

export interface MarketDriver {
  readonly category:
    | "Geopolitical"
    | "Supply"
    | "Demand"
    | "Inventory"
    | "Manufacturing"
    | "Macro"
    | "FX"
    | "Energy"
    | "Weather"
    | "Shipping";
  readonly contribution: number;
  readonly direction: TrendDirection;
  readonly headline: string;
  readonly evidence: string;
  readonly risk: RiskLevel;
}

export const topMarketDrivers: readonly MarketDriver[] = [
  {
    category: "Geopolitical",
    contribution: 19,
    direction: "up",
    headline: "Route-security premium persists",
    evidence: "3 validated events",
    risk: "high",
  },
  {
    category: "Supply",
    contribution: 16,
    direction: "up",
    headline: "Crude availability is tightening",
    evidence: "EIA and shipping",
    risk: "medium",
  },
  {
    category: "Shipping",
    contribution: 14,
    direction: "up",
    headline: "Transit times exceed the 90-day band",
    evidence: "2 monitored routes",
    risk: "high",
  },
  {
    category: "Energy",
    contribution: 11,
    direction: "up",
    headline: "Energy complex remains firm",
    evidence: "Brent, WTI and LNG",
    risk: "medium",
  },
  {
    category: "Inventory",
    contribution: 8,
    direction: "up",
    headline: "Crude stocks sit below seasonal range",
    evidence: "Weekly inventory",
    risk: "medium",
  },
  {
    category: "FX",
    contribution: 4,
    direction: "up",
    headline: "Dollar strength adds landed-cost pressure",
    evidence: "Trade-weighted USD",
    risk: "low",
  },
  {
    category: "Weather",
    contribution: 2,
    direction: "flat",
    headline: "No broad weather disruption signal",
    evidence: "NOAA watch set",
    risk: "low",
  },
  {
    category: "Demand",
    contribution: -3,
    direction: "down",
    headline: "Downstream orders remain soft",
    evidence: "3 demand series",
    risk: "low",
  },
  {
    category: "Macro",
    contribution: -5,
    direction: "down",
    headline: "Industrial momentum is moderating",
    evidence: "Macro composite",
    risk: "medium",
  },
  {
    category: "Manufacturing",
    contribution: -7,
    direction: "down",
    headline: "Utilization is stable but not accelerating",
    evidence: "3 production sites",
    risk: "low",
  },
] as const;

export interface RankedRisk {
  readonly rank: number;
  readonly title: string;
  readonly probability: string;
  readonly impact: "Critical" | "High" | "Moderate";
  readonly urgency: string;
  readonly confidence: number;
  readonly summary: string;
  readonly risk: RiskLevel;
}

export const rankedRisks: readonly RankedRisk[] = [
  {
    rank: 1,
    title: "Gulf route disruption intersects Rotterdam cover",
    probability: "Likely (60-75%)",
    impact: "Critical",
    urgency: "7 days",
    confidence: 86,
    summary:
      "A further transit delay would consume the current feedstock buffer.",
    risk: "critical",
  },
  {
    rank: 2,
    title: "Crude strength raises naphtha replacement cost",
    probability: "Possible (40-60%)",
    impact: "High",
    urgency: "14 days",
    confidence: 82,
    summary:
      "Energy strength is passing through to the monitored feedstock basket.",
    risk: "high",
  },
  {
    rank: 3,
    title: "Copper volatility affects planned Q4 commitments",
    probability: "Possible (35-50%)",
    impact: "Moderate",
    urgency: "30 days",
    confidence: 74,
    summary:
      "Volatility is elevated, but the directional signal remains mixed.",
    risk: "medium",
  },
  {
    rank: 4,
    title: "Palm-oil weather premium re-emerges",
    probability: "Unlikely (20-35%)",
    impact: "Moderate",
    urgency: "45 days",
    confidence: 63,
    summary:
      "Weather conditions merit monitoring but do not yet justify action.",
    risk: "low",
  },
] as const;

export interface IntelligenceFeedItem {
  readonly id: string;
  readonly type: "news" | "signal" | "operations";
  readonly title: string;
  readonly summary: string;
  readonly source: string;
  readonly time: string;
  readonly risk: RiskLevel;
}

export const latestCommandIntelligence: readonly IntelligenceFeedItem[] = [
  {
    id: "intel-1",
    type: "signal",
    title: "Brent-WTI spread widened with freight pressure",
    summary:
      "The move reinforces the current energy-strength signal without changing the 30-day regime.",
    source: "DORA signal",
    time: "8 min",
    risk: "medium",
  },
  {
    id: "intel-2",
    type: "news",
    title: "Inventory update points to tighter near-term crude balances",
    summary: "Commercial stocks moved below the five-year seasonal range.",
    source: "EIA",
    time: "18 min",
    risk: "medium",
  },
  {
    id: "intel-3",
    type: "operations",
    title: "Rotterdam confirms nine days of critical feedstock cover",
    summary:
      "Coverage is adequate today but overlaps the adverse shipping scenario.",
    source: "Manufacturing",
    time: "42 min",
    risk: "high",
  },
  {
    id: "intel-4",
    type: "signal",
    title: "Nickel downside trend strengthened",
    summary:
      "The move reduces input-cost pressure but does not require management action.",
    source: "DORA signal",
    time: "1 hr",
    risk: "low",
  },
  {
    id: "intel-5",
    type: "news",
    title: "Palm-oil export inspections remain seasonally firm",
    summary: "Demand is supportive while weather risk remains low confidence.",
    source: "USDA",
    time: "2 hr",
    risk: "low",
  },
] as const;

export interface ManagementAttentionItem {
  readonly priority: "Decide" | "Validate" | "Watch";
  readonly title: string;
  readonly action: string;
  readonly owner: string;
  readonly due: string;
  readonly why: string;
  readonly risk: RiskLevel;
}

export const managementAttention: readonly ManagementAttentionItem[] = [
  {
    priority: "Decide",
    title: "Rotterdam forward cover",
    action:
      "Compare a 10% cover extension against expedite and shortage exposure.",
    owner: "Chief Procurement Officer",
    due: "Before Friday",
    why: "The decision window is seven to ten days and shrinking.",
    risk: "critical",
  },
  {
    priority: "Validate",
    title: "Gulf transit assumption",
    action: "Confirm supplier lead times and alternative-route availability.",
    owner: "Supply Chain VP",
    due: "Within 48 hours",
    why: "Current route data drives the highest-ranked risk.",
    risk: "high",
  },
  {
    priority: "Watch",
    title: "Copper Q4 commitments",
    action:
      "Hold the current tolerance band and review after the next volatility cycle.",
    owner: "Metals Category Lead",
    due: "Next weekly review",
    why: "Volatility is material, but direction remains mixed.",
    risk: "medium",
  },
] as const;
