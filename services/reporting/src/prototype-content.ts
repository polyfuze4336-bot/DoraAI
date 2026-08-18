import type { WeeklyBriefContent } from "./contracts";

export function createPrototypeWeeklyBriefContent(
  asOf = new Date().toISOString(),
): WeeklyBriefContent {
  return {
    asOf,
    executiveSummary: [
      "Energy and freight signals retain a moderately bullish near-term bias.",
      "Brent's 30-day baseline remains upward, while its uncertainty range widens materially.",
      "Gulf transit disruption is the highest deterministically scored emerging risk.",
      "Manufacturing demand is supportive overall, with two constrained or disrupted demo sites.",
      "Management should monitor shipping, feedstock coverage and forecast invalidation signals.",
    ],
    marketOutlook: [
      "Near-term market direction is firm; beyond 30 days the range matters more than the midpoint.",
    ],
    majorCommodityMoves: [
      "Brent +5.2% over 30 days in the prototype snapshot.",
      "Nickel -5.7% over 30 days, contradicting broad metals strength.",
      "Natural gas remains range-bound with mixed horizon changes.",
    ],
    keyDrivers: [
      "Supply and shipping pressure",
      "Geopolitical route risk",
      "Supportive manufacturing utilization",
      "Mixed macro and USD signals",
    ],
    emergingRisks: [
      "Gulf transit disruption",
      "Copper mine supply interruption",
      "China manufacturing demand slowdown",
    ],
    manufacturingSignals: [
      "Weighted utilization is approximately 75% across seeded demo sites.",
      "Santos is disrupted and Texas is constrained; records are demo data, not internal telemetry.",
    ],
    forecastChanges: [
      "No prior production forecast is available; change comparison remains prototype-only.",
    ],
    managementActions: [
      "Review route contingency and near-term crude coverage.",
      "Validate feedstock inventory at constrained sites.",
      "Monitor signals that would invalidate the current upward Brent baseline.",
    ],
    watchlist: [
      "Gulf shipping and freight premiums",
      "EIA inventory publication",
      "China manufacturing orders",
      "USD broad index",
    ],
    confidenceAndDataQuality: [
      "Prototype confidence is based on seeded market, risk and manufacturing inputs.",
      "Foundry is optional and unconfigured; report language is deterministic.",
      "Commercial and internal data sources remain deployment/configuration gates.",
    ],
  };
}
