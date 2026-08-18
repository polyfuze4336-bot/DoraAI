export const priceSeries = [
  { date: "Aug 04", actual: 76.4, forecast: null },
  { date: "Aug 05", actual: 76.9, forecast: null },
  { date: "Aug 06", actual: 75.8, forecast: null },
  { date: "Aug 07", actual: 77.2, forecast: null },
  { date: "Aug 08", actual: 78.1, forecast: null },
  { date: "Aug 09", actual: 77.7, forecast: null },
  { date: "Aug 10", actual: 79.3, forecast: null },
  { date: "Aug 11", actual: 80.1, forecast: null },
  { date: "Aug 12", actual: 79.6, forecast: null },
  { date: "Aug 13", actual: 81.2, forecast: null },
  { date: "Aug 14", actual: 80.8, forecast: 80.8 },
  { date: "Aug 15", actual: null, forecast: 81.5 },
  { date: "Aug 16", actual: null, forecast: 82.1 },
  { date: "Aug 17", actual: null, forecast: 82.6 },
] as const;

export const commodityRows = [
  {
    symbol: "WTI",
    name: "Crude oil",
    value: "$80.82",
    change: "+2.4%",
    direction: "up",
  },
  {
    symbol: "NG",
    name: "Natural gas",
    value: "$2.91",
    change: "-1.1%",
    direction: "down",
  },
  {
    symbol: "CU",
    name: "Copper",
    value: "$4.47",
    change: "+0.8%",
    direction: "up",
  },
  {
    symbol: "AL",
    name: "Aluminium",
    value: "$2,614",
    change: "+0.3%",
    direction: "up",
  },
] as const;

export const riskItems = [
  {
    level: "High",
    title: "Gulf shipping constraint",
    detail: "Freight lead-time exposure increased across two monitored routes.",
    horizon: "7-21 days",
  },
  {
    level: "Medium",
    title: "Copper treatment charges",
    detail: "Smelter economics remain compressed against the 90-day range.",
    horizon: "30-60 days",
  },
  {
    level: "Low",
    title: "Midwest gas availability",
    detail: "Storage cover remains inside the expected seasonal band.",
    horizon: "14 days",
  },
] as const;

export const newsItems = [
  {
    source: "EIA",
    time: "18 min",
    title: "Inventory data points to tighter near-term crude balances",
    commodity: "Crude oil",
  },
  {
    source: "USDA",
    time: "43 min",
    title: "Export inspections hold above the five-year seasonal median",
    commodity: "Agriculture",
  },
  {
    source: "DORA signal",
    time: "1 hr",
    title: "Copper volatility crossed the monitored percentile band",
    commodity: "Copper",
  },
  {
    source: "Manufacturing",
    time: "2 hr",
    title: "Rotterdam line confirms nine days of critical feedstock cover",
    commodity: "Operations",
  },
] as const;

export const manufacturingSites = [
  {
    site: "Rotterdam",
    status: "Constrained",
    coverage: "9 days",
    utilization: 88,
  },
  { site: "Houston", status: "Normal", coverage: "24 days", utilization: 93 },
  { site: "Singapore", status: "Normal", coverage: "19 days", utilization: 90 },
] as const;

export const forecastSeries = priceSeries.map((point) => ({
  label: point.date.replace("Aug ", ""),
  actual: point.actual,
  forecast: point.forecast,
}));

export const marketPulseItems = [
  { label: "Price pressure", value: 74, descriptor: "Rising", risk: "medium" },
  {
    label: "Supply tightness",
    value: 68,
    descriptor: "Above normal",
    risk: "medium",
  },
  { label: "Demand momentum", value: 57, descriptor: "Balanced", risk: "low" },
  {
    label: "Operational exposure",
    value: 41,
    descriptor: "Contained",
    risk: "low",
  },
] as const;

export const reasoningActivity = [
  {
    label: "Signal retrieval",
    detail: "18 validated signals selected",
    status: "complete",
  },
  {
    label: "Evidence ranking",
    detail: "6 sources passed policy and freshness checks",
    status: "complete",
  },
  {
    label: "Executive synthesis",
    detail: "Grounded response streaming",
    status: "running",
  },
  {
    label: "Citation validation",
    detail: "Runs after synthesis completes",
    status: "queued",
  },
] as const;

export const evidenceItems = [
  {
    id: "eia-wti-inventory",
    title: "Weekly petroleum status: crude balances",
    source: "EIA",
    publishedAt: "18 min ago",
    excerpt:
      "Commercial crude inventories moved below the five-year seasonal range while refinery utilization remained elevated.",
    relevance: 96,
    sourceUrl: "https://www.eia.gov/petroleum/supply/weekly/",
  },
  {
    id: "dora-freight-signal",
    title: "Gulf to Rotterdam freight lead-time signal",
    source: "DORA signal",
    publishedAt: "43 min ago",
    excerpt:
      "Median quoted lead time increased by 2.8 days across two monitored routes and now overlaps the Rotterdam coverage window.",
    relevance: 91,
    sourceUrl: "/timeline",
  },
  {
    id: "manufacturing-cover",
    title: "Rotterdam critical feedstock coverage",
    source: "Manufacturing",
    publishedAt: "2 hr ago",
    excerpt:
      "Validated site snapshot shows nine days of critical feedstock cover at current utilization assumptions.",
    relevance: 88,
    sourceUrl: "/manufacturing",
  },
] as const;

export const dashboardNotifications = [
  {
    id: "risk-gulf-route",
    title: "Shipping exposure moved to high",
    detail:
      "The Gulf route signal now intersects the Rotterdam decision window.",
    time: "6 minutes ago",
    risk: "high",
  },
  {
    id: "brief-ready",
    title: "Morning brief refreshed",
    detail: "Six source updates were incorporated and citations validated.",
    time: "18 minutes ago",
    risk: "info",
  },
  {
    id: "source-delay",
    title: "One macro source delayed",
    detail: "The delayed series does not affect current material signals.",
    time: "42 minutes ago",
    risk: "low",
    read: true,
  },
] as const;
