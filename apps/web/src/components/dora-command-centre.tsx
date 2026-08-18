"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  BrainCircuit,
  ChartNoAxesCombined,
  ChevronRight,
  Clock3,
  Eye,
  Factory,
  FileText,
  Gauge,
  Globe2,
  Library,
  Menu,
  Newspaper,
  Radar,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";

import {
  AnimatedNumber,
  ConfidenceIndicator,
  DoraCard,
  EvidenceDrawer,
  ForecastCard,
  FreshnessIndicator,
  NotificationPanel,
  ProfileMenu,
  RiskBadge,
  SourceBadge,
  TrendIndicator,
  type EvidenceItem,
  type InsightExplanation,
  type ReasoningTrace,
  type TrendDirection,
} from "@/components/design-system";
import {
  commandCommodities,
  latestCommandIntelligence,
  managementAttention,
  outlookHorizons,
  rankedRisks,
  topMarketDrivers,
  type CommandCommodity,
  type OutlookHorizon,
} from "@/lib/command-centre-data";
import { dashboardNotifications, evidenceItems } from "@/lib/dashboard-data";
import { ForecastAccuracyPanel } from "@/components/forecast-accuracy-panel";

interface DoraCommandCentreProps {
  readonly appName: string;
  readonly demoMode: boolean;
}

interface SelectedAnalysis {
  readonly title: string;
  readonly summary: string;
  readonly evidence: readonly EvidenceItem[];
  readonly reasoning: ReasoningTrace;
  readonly explanation: InsightExplanation;
}

const overallReasoning: ReasoningTrace = {
  summary:
    "DORA combines directional price signals, event evidence, source freshness and manufacturing exposure. Deterministic scores establish the market state; AI synthesizes the management interpretation.",
  steps: [
    "Validated 32 current signals across ten selected commodities.",
    "Weighted material signals by freshness, source confidence and portfolio exposure.",
    "Separated supportive energy and shipping pressure from weaker manufacturing and macro inputs.",
    "Checked the interpretation against forecast ranges and current operational coverage.",
  ],
  limitations: [
    "Prototype prices and normalized outlook indices are illustrative until licensed feeds are connected.",
    "Forecast bands represent scenario uncertainty, not calibrated market probabilities.",
  ],
};

const questionCards = [
  {
    question: "What is happening?",
    answer: "Energy and freight are driving a moderately bullish market state.",
    icon: Gauge,
    accent: "teal",
  },
  {
    question: "Why is it happening?",
    answer:
      "Supply, geopolitical and shipping pressure outweigh softer demand.",
    icon: Radar,
    accent: "cyan",
  },
  {
    question: "What happens next?",
    answer:
      "Near-term firmness is likely; uncertainty expands materially after 30 days.",
    icon: ChartNoAxesCombined,
    accent: "blue",
  },
  {
    question: "What needs attention?",
    answer:
      "Rotterdam cover and Gulf transit assumptions require management action.",
    icon: Target,
    accent: "amber",
  },
] as const;

export function DoraCommandCentre({
  appName,
  demoMode,
}: DoraCommandCentreProps) {
  const reducedMotion = useReducedMotion();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SelectedAnalysis>({
    title: "Overall market state",
    summary: "Markets remain moderately bullish.",
    evidence: evidenceItems,
    reasoning: overallReasoning,
    explanation: buildCommandExplanation(
      "Markets remain moderately bullish.",
      outlookHorizons[1],
    ),
  });
  const [selectedCommodity, setSelectedCommodity] = useState("WTI");
  const [selectedHorizon, setSelectedHorizon] = useState<OutlookHorizon>("7d");
  const [commodityCategory, setCommodityCategory] = useState<
    "All" | CommandCommodity["category"]
  >("All");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const [lastAnalysis, setLastAnalysis] = useState("08:42 UTC");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("story") === "why") {
      setEvidenceOpen(true);
    }
  }, []);

  const selectedCommodityData =
    commandCommodities.find((item) => item.symbol === selectedCommodity) ??
    commandCommodities[1];
  const selectedHorizonData =
    outlookHorizons.find((item) => item.id === selectedHorizon) ??
    outlookHorizons[1];
  const visibleCommodities = commandCommodities.filter(
    (item) =>
      commodityCategory === "All" || item.category === commodityCategory,
  );
  const filteredIntelligence = deferredQuery
    ? latestCommandIntelligence.filter((item) =>
        `${item.title} ${item.summary} ${item.source}`
          .toLowerCase()
          .includes(deferredQuery),
      )
    : latestCommandIntelligence;

  function openAnalysis(
    title: string,
    summary: string,
    reasoningSteps: readonly string[] = overallReasoning.steps,
    riskLimitations: readonly string[] = overallReasoning.limitations,
  ) {
    setSelectedAnalysis({
      title,
      summary,
      evidence: evidenceItems,
      reasoning: {
        summary,
        steps: reasoningSteps,
        limitations: riskLimitations,
      },
      explanation: buildCommandExplanation(
        summary,
        /forecast|outlook|market state|market view|price/i.test(title)
          ? selectedHorizonData
          : undefined,
      ),
    });
    setEvidenceOpen(true);
  }

  function refreshAnalysis() {
    startTransition(() => {
      setLastAnalysis(
        `${new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
          hour12: false,
        }).format(new Date())} UTC`,
      );
    });
  }

  return (
    <Tooltip.Provider delayDuration={220}>
      <div className="min-h-screen xl:grid xl:grid-cols-[248px_minmax(0,1fr)]">
        <CommandNavigation
          appName={appName}
          demoMode={demoMode}
          onClose={() => setNavigationOpen(false)}
          open={navigationOpen}
        />

        <main className="min-w-0 xl:col-start-2">
          <CommandTopBar
            appName={appName}
            lastAnalysis={lastAnalysis}
            onMenu={() => setNavigationOpen(true)}
            onRefresh={refreshAnalysis}
            resultCount={filteredIntelligence.length}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-[1560px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <MarketStateHeader
              lastAnalysis={lastAnalysis}
              onInspect={() =>
                openAnalysis(
                  "Overall market state",
                  "Energy strength and geopolitical risk outweigh weaker downstream manufacturing indicators.",
                )
              }
            />

            <section
              aria-label="Executive questions"
              className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            >
              {questionCards.map((item) => (
                <QuestionCard
                  answer={item.answer}
                  icon={item.icon}
                  key={item.question}
                  onClick={() => openAnalysis(item.question, item.answer)}
                  question={item.question}
                />
              ))}
            </section>

            <CommodityTickerSection
              category={commodityCategory}
              commodities={visibleCommodities}
              onCategory={setCommodityCategory}
              onInspect={(commodity) => {
                setSelectedCommodity(commodity.symbol);
                openAnalysis(
                  `${commodity.name} market view`,
                  `${commodity.name} is ${commodity.forecastDirection} with ${commodity.confidence}% signal confidence.`,
                  [
                    `Compared 24-hour, 7-day and 30-day returns for ${commodity.name}.`,
                    `Evaluated directional trend and cross-commodity confirmation within ${commodity.category}.`,
                    "Applied source freshness and volatility penalties to the confidence score.",
                  ],
                );
              }}
              selectedSymbol={selectedCommodity}
            />

            <section className="mt-6 grid gap-5 lg:grid-cols-12">
              <MarketPulseScore
                className="lg:col-span-4"
                onInspect={() =>
                  openAnalysis(
                    "Market pulse: +34",
                    "The aggregate score is moderately bullish, led by energy, shipping and geopolitical inputs.",
                  )
                }
              />
              <DoraOutlook
                className="lg:col-span-8"
                onInspect={() =>
                  openAnalysis(
                    "DORA outlook",
                    "Near-term firmness is likely, but management should treat the 30-day and 90-day direction as a widening range rather than a point forecast.",
                  )
                }
              />

              {selectedCommodityData && selectedHorizonData ? (
                <PriceOutlook
                  className="lg:col-span-8"
                  commodity={selectedCommodityData}
                  horizon={selectedHorizonData}
                  onHorizon={setSelectedHorizon}
                  onInspect={() =>
                    openAnalysis(
                      `${selectedCommodityData.name} ${selectedHorizonData.label} outlook`,
                      `The central directional index is ${selectedHorizonData.projected.toFixed(1)}, with a ${selectedHorizonData.low.toFixed(1)}-${selectedHorizonData.high.toFixed(1)} uncertainty range.`,
                      [
                        "Normalized the current commodity price to an index of 100.",
                        `Applied the deterministic ${selectedHorizonData.label} baseline and residual variability.`,
                        "Widened uncertainty for horizon length and current event risk.",
                      ],
                      [
                        "The index communicates direction, not a precise target price.",
                        "Licensed forward curves are not connected in prototype mode.",
                      ],
                    )
                  }
                  selectedHorizon={selectedHorizon}
                />
              ) : null}
              <DriverSummary
                className="lg:col-span-4"
                onInspect={(title, summary) => openAnalysis(title, summary)}
              />
              <ForecastAccuracyPanel className="lg:col-span-12" />
            </section>

            <TopDriversSection
              onInspect={(title, summary) => openAnalysis(title, summary)}
            />
            <EmergingRisksSection
              onInspect={(title, summary) => openAnalysis(title, summary)}
            />

            <section
              className="mt-6 grid scroll-mt-24 gap-5 lg:grid-cols-12"
              id="latest-intelligence"
            >
              <LatestIntelligence
                className="lg:col-span-7"
                items={filteredIntelligence}
                onInspect={(title, summary) => openAnalysis(title, summary)}
                query={searchQuery}
              />
              <ManagementAttention
                className="lg:col-span-5"
                onInspect={(title, summary) => openAnalysis(title, summary)}
              />
            </section>
          </motion.div>
        </main>

        <EvidenceDrawer
          evidence={selectedAnalysis.evidence}
          explanation={selectedAnalysis.explanation}
          onOpenChange={setEvidenceOpen}
          open={evidenceOpen}
          reasoning={selectedAnalysis.reasoning}
          title={selectedAnalysis.title}
        />
      </div>
    </Tooltip.Provider>
  );
}

function buildCommandExplanation(
  summary: string,
  horizon?: (typeof outlookHorizons)[number],
): InsightExplanation {
  const updatedAt = new Date().toISOString();
  const signals = [
    {
      id: "explain-price-momentum",
      label: "Price momentum",
      detail:
        "Energy momentum remains positive across 24-hour and 30-day windows.",
      category: "price" as const,
      updatedAt,
      freshness: "fresh" as const,
    },
    {
      id: "explain-inventory",
      label: "Inventory balance",
      detail: "Inventory evidence points to tighter near-term balances.",
      category: "inventory" as const,
      updatedAt,
      freshness: "fresh" as const,
    },
    {
      id: "explain-supply",
      label: "Supply and shipping pressure",
      detail: "Supply and route signals add upward cost pressure.",
      category: "supply" as const,
      updatedAt,
      freshness: "fresh" as const,
    },
    {
      id: "explain-geopolitical",
      label: "Geopolitical risk",
      detail:
        "Gulf transit risk raises the probability of near-term disruption.",
      category: "geopolitical" as const,
      updatedAt,
      freshness: "fresh" as const,
    },
    {
      id: "explain-news",
      label: "Material news",
      detail: "Recent event evidence corroborates shipping and supply risks.",
      category: "news" as const,
      updatedAt,
      freshness: "fresh" as const,
    },
  ];
  const contradictingSignals = [
    {
      id: "explain-macro",
      label: "Softer macro demand",
      detail:
        "Manufacturing orders and selected macro indicators limit bullish conviction.",
      category: "macro" as const,
      updatedAt,
      freshness: "delayed" as const,
    },
    {
      id: "explain-manufacturing",
      label: "Mixed manufacturing demand",
      detail:
        "Two demo sites are constrained or disrupted, weakening aggregate demand confirmation.",
      category: "manufacturing" as const,
      updatedAt,
      freshness: "fresh" as const,
    },
  ];
  return {
    supportingSignals: signals,
    contradictingSignals,
    modelForecast: horizon
      ? {
          model: "interpretable-baseline-ensemble",
          modelVersion: "1.0.0",
          horizon: horizon.label,
          forecast: horizon.projected.toFixed(1),
          lowerBound: horizon.low.toFixed(1),
          upperBound: horizon.high.toFixed(1),
          confidence: horizon.confidence,
          generatedAt: updatedAt,
        }
      : undefined,
    aiInterpretation: {
      observedEvidence: signals.map((item) => item.label),
      relevantDrivers: signals.slice(0, 3).map((item) => item.detail),
      conflictingIndicators: contradictingSignals.map((item) => item.detail),
      conclusion: summary,
      confidence: horizon?.confidence ?? 72,
      uncertainties: overallReasoning.limitations,
    },
  };
}

function CommandNavigation({
  appName,
  demoMode,
  onClose,
  open,
}: {
  readonly appName: string;
  readonly demoMode: boolean;
  readonly onClose: () => void;
  readonly open: boolean;
}) {
  const navigation = [
    {
      section: "Overview",
      items: [
        { label: "Dashboard", icon: Gauge, href: "/dashboard", active: true },
      ],
    },
    {
      section: "Intelligence",
      items: [
        {
          label: "Market",
          icon: ChartNoAxesCombined,
          href: "/?domain=market-intelligence",
        },
        {
          label: "Commodities",
          icon: Activity,
          href: "/?domain=commodity-price",
        },
        { label: "News", icon: Newspaper, href: "/?domain=news-updates" },
        { label: "Risks", icon: ShieldAlert, href: "/risks" },
        { label: "Manufacturing", icon: Factory, href: "/manufacturing" },
        { label: "Scenarios", icon: Radar, href: "/scenarios" },
      ],
    },
    {
      section: "AI",
      items: [
        { label: "Ask DORA", icon: Sparkles, href: "/dashboard?ask=1" },
        {
          label: "Insights",
          icon: BrainCircuit,
          href: "/?domain=market-intelligence",
        },
      ],
    },
    {
      section: "Knowledge",
      items: [
        { label: "Research", icon: Library, href: "/knowledge" },
        { label: "Sources", icon: Globe2, href: "/sources" },
      ],
    },
    {
      section: "Management",
      items: [
        { label: "Reports", icon: FileText, href: "/reports" },
        { label: "Alerts", icon: BellRing, href: "/alerts" },
        { label: "Timeline", icon: Clock3, href: "/timeline" },
      ],
    },
    {
      section: "Performance",
      items: [
        { label: "Forecast & health", icon: Target, href: "/performance" },
      ],
    },
    {
      section: "Administration",
      items: [{ label: "Settings", icon: Settings, href: "/settings" }],
    },
  ];

  return (
    <>
      {open ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-[rgba(8,19,30,.28)] backdrop-blur-[2px] xl:hidden"
          onClick={onClose}
          type="button"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col overflow-hidden border-r border-white/10 bg-[var(--navy)] text-white transition-transform duration-200 xl:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        data-print-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(24,127,159,.18),transparent_38%)]" />
        <div className="relative flex h-[76px] items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-[9px] bg-white font-serif text-xl font-semibold text-[var(--navy)]">
              D
            </div>
            <div>
              <div className="text-sm font-extrabold">{appName}</div>
              <div className="text-[9px] text-white/40">
                Executive Command Centre
              </div>
            </div>
          </div>
          <button
            aria-label="Close navigation"
            className="grid h-9 w-9 place-items-center rounded-[8px] text-white/60 hover:bg-white/10 xl:hidden"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>

        <nav
          aria-label="Command centre navigation"
          className="relative flex-1 overflow-y-auto px-3 py-6"
        >
          <div className="space-y-5">
            {navigation.map((group) => (
              <div key={group.section}>
                <div className="px-3 pb-1.5 text-[9px] font-bold uppercase text-white/35">
                  {group.section}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = "active" in item && item.active;
                    return (
                      <Link
                        aria-current={active ? "page" : undefined}
                        className={`flex h-9 w-full items-center gap-3 rounded-[7px] px-3 text-left text-xs font-semibold ${active ? "bg-white text-[var(--navy)] shadow-sm" : "text-white/58 hover:bg-white/8 hover:text-white"}`}
                        href={item.href}
                        key={item.label}
                        onClick={onClose}
                      >
                        <Icon aria-hidden="true" size={15} strokeWidth={1.8} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="relative border-t border-white/10 p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] text-white/40">Environment</span>
            <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[9px] font-bold text-white/70">
              {demoMode ? "Prototype" : "Connected"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--cyan-soft)] text-[10px] font-extrabold text-[var(--navy)]">
              MK
            </div>
            <div>
              <div className="text-xs font-bold">Maya Khan</div>
              <div className="mt-0.5 text-[10px] text-white/40">
                Executive sponsor
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function CommandTopBar({
  appName,
  lastAnalysis,
  onMenu,
  onRefresh,
  resultCount,
  searchQuery,
  setSearchQuery,
}: {
  readonly appName: string;
  readonly lastAnalysis: string;
  readonly onMenu: () => void;
  readonly onRefresh: () => void;
  readonly resultCount: number;
  readonly searchQuery: string;
  readonly setSearchQuery: (value: string) => void;
}) {
  return (
    <header
      className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b border-white/65 bg-[rgba(248,249,246,.8)] px-4 shadow-[var(--shadow-hairline)] backdrop-blur-xl sm:px-6 lg:px-8"
      data-print-hidden="true"
    >
      <button
        aria-label="Open navigation"
        className="dora-floating-control grid h-10 w-10 place-items-center xl:hidden"
        onClick={onMenu}
        type="button"
      >
        <Menu aria-hidden="true" size={17} />
      </button>
      <div className="hidden sm:flex sm:items-center sm:gap-2 xl:hidden">
        <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-[var(--navy)] font-serif text-white">
          D
        </span>
        <span className="text-xs font-extrabold text-[var(--navy)]">
          {appName}
        </span>
      </div>
      <form
        className="relative min-w-0 max-w-[520px] flex-1 sm:ml-2 xl:ml-0"
        onSubmit={(event) => {
          event.preventDefault();
          document
            .getElementById("latest-intelligence")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        role="search"
      >
        <label className="relative block">
          <span className="sr-only">Search latest intelligence</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
            size={15}
          />
          <input
            className={`h-10 w-full rounded-[9px] border border-white/70 bg-white/60 pl-9 text-xs shadow-[var(--shadow-control)] outline-none backdrop-blur-lg placeholder:text-[var(--ink-faint)] focus:border-[var(--cyan)] focus:bg-white ${searchQuery.trim() ? "pr-20" : "pr-3"}`}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search latest intelligence"
            type="search"
            value={searchQuery}
          />
        </label>
        {searchQuery.trim() ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[var(--ink-muted)]">
            {resultCount} result{resultCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </form>
      <div className="ml-auto hidden text-right lg:block">
        <div className="text-[10px] font-bold">Analysis {lastAnalysis}</div>
        <div className="mt-0.5 text-[9px] text-[var(--ink-muted)]">
          32 signals monitored
        </div>
      </div>
      <button
        aria-label="Refresh analysis"
        className="dora-floating-control grid h-10 w-10 place-items-center"
        onClick={onRefresh}
        type="button"
      >
        <RefreshCw aria-hidden="true" size={16} />
      </button>
      <NotificationPanel notifications={dashboardNotifications} />
      <ProfileMenu />
    </header>
  );
}

function MarketStateHeader({
  lastAnalysis,
  onInspect,
}: {
  readonly lastAnalysis: string;
  readonly onInspect: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[14px] border border-white/10 bg-[var(--navy)] px-5 py-6 text-white shadow-[0_22px_60px_rgba(13,38,56,.16)] sm:px-7 sm:py-8 lg:px-9">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(24,127,159,.2),transparent_35%)]" />
      <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-white/52">
            <Globe2 aria-hidden="true" size={13} /> Global commodity state
          </div>
          <h1 className="mt-4 max-w-3xl font-serif text-[34px] font-medium leading-[1.04] sm:text-[46px]">
            Markets remain moderately bullish
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/62">
            Energy strength and geopolitical risk are outweighing weaker
            downstream manufacturing indicators.
          </p>
          <button
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-[7px] border border-white/15 bg-white/8 px-3 text-xs font-bold text-white backdrop-blur hover:bg-white/14"
            onClick={onInspect}
            type="button"
          >
            <FileText aria-hidden="true" size={14} /> Evidence and reasoning
          </button>
        </div>
        <div className="grid min-w-[300px] grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-white/10 bg-white/10 sm:grid-cols-4 lg:grid-cols-2">
          <HeaderMetric label="Overall signal">
            <span className="font-serif text-2xl text-[#85d8c7]">+34</span>
            <span className="text-[9px] text-white/42">of -100 to +100</span>
          </HeaderMetric>
          <HeaderMetric label="Confidence">
            <ConfidenceIndicator className="text-white/65" value={87} />
          </HeaderMetric>
          <HeaderMetric label="Last analysis">
            <span className="text-sm font-bold">{lastAnalysis}</span>
            <span className="text-[9px] text-white/42">Aug 17, 2026</span>
          </HeaderMetric>
          <HeaderMetric label="Coverage">
            <span className="text-sm font-bold">32 signals</span>
            <span className="text-[9px] text-[#efc784]">4 emerging risks</span>
          </HeaderMetric>
        </div>
      </div>
    </section>
  );
}

function HeaderMetric({
  children,
  label,
}: {
  readonly children: React.ReactNode;
  readonly label: string;
}) {
  return (
    <div className="flex min-h-[86px] flex-col justify-center bg-white/[.035] px-4 py-3">
      <span className="mb-2 text-[9px] font-bold uppercase text-white/38">
        {label}
      </span>
      {children}
    </div>
  );
}

function QuestionCard({
  answer,
  icon: Icon,
  onClick,
  question,
}: {
  readonly answer: string;
  readonly icon: typeof Gauge;
  readonly onClick: () => void;
  readonly question: string;
}) {
  return (
    <button
      className="dora-card group min-h-[136px] rounded-[12px] border border-[var(--line)] bg-[var(--surface)] p-5 text-left hover:-translate-y-0.5 hover:border-[var(--line-strong)]"
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-[var(--teal-soft)] text-[var(--teal)]">
          <Icon aria-hidden="true" size={15} />
        </span>
        <ArrowRight
          aria-hidden="true"
          className="text-[var(--ink-faint)] transition-transform group-hover:translate-x-0.5"
          size={14}
        />
      </div>
      <div className="mt-4 text-[10px] font-bold uppercase text-[var(--ink-muted)]">
        {question}
      </div>
      <p className="mt-1.5 text-xs font-semibold leading-5 text-[var(--ink)]">
        {answer}
      </p>
    </button>
  );
}

function CommodityTickerSection({
  category,
  commodities,
  onCategory,
  onInspect,
  selectedSymbol,
}: {
  readonly category: "All" | CommandCommodity["category"];
  readonly commodities: readonly CommandCommodity[];
  readonly onCategory: (value: "All" | CommandCommodity["category"]) => void;
  readonly onInspect: (commodity: CommandCommodity) => void;
  readonly selectedSymbol: string;
}) {
  const categories = [
    "All",
    "Energy",
    "Metals",
    "Agriculture",
    "Feedstocks",
  ] as const;
  return (
    <DoraCard
      className="mt-6"
      contentClassName="pb-1"
      description="Selected global benchmarks and portfolio-relevant feedstocks"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-[var(--ink-muted)]">
          <span>
            Illustrative prototype snapshot; not exchange-licensed real-time
            data.
          </span>
          <FreshnessIndicator label="Prototype" status="unknown" />
        </div>
      }
      title="Commodity ticker"
      action={
        <div className="flex max-w-[calc(100vw-48px)] items-center gap-1 overflow-x-auto rounded-[8px] bg-[var(--surface-subtle)] p-1">
          {categories.map((item) => (
            <button
              aria-pressed={category === item}
              className={`h-7 shrink-0 rounded-[6px] px-2.5 text-[9px] font-bold ${category === item ? "bg-white text-[var(--navy)] shadow-sm" : "text-[var(--ink-muted)]"}`}
              key={item}
              onClick={() => onCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-y border-[var(--line-soft)] text-[9px] font-bold uppercase text-[var(--ink-muted)]">
              <th className="px-5 py-3">Commodity</th>
              <th className="px-3 py-3">Current price</th>
              <th className="px-3 py-3">24H</th>
              <th className="px-3 py-3">7D</th>
              <th className="px-3 py-3">30D</th>
              <th className="px-3 py-3">Trend</th>
              <th className="px-3 py-3">Forecast</th>
              <th className="px-5 py-3 text-right">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line-soft)]">
            {commodities.map((commodity) => (
              <CommodityRow
                commodity={commodity}
                key={commodity.symbol}
                onClick={() => onInspect(commodity)}
                selected={selectedSymbol === commodity.symbol}
              />
            ))}
          </tbody>
        </table>
      </div>
    </DoraCard>
  );
}

function CommodityRow({
  commodity,
  onClick,
  selected,
}: {
  readonly commodity: CommandCommodity;
  readonly onClick: () => void;
  readonly selected: boolean;
}) {
  return (
    <tr
      aria-label={`Inspect ${commodity.name}`}
      className={`cursor-pointer transition-colors hover:bg-[var(--surface-subtle)] ${selected ? "bg-[var(--teal-soft)]/35" : ""}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-8 min-w-10 place-items-center rounded-[7px] px-1 text-[9px] font-extrabold ${selected ? "bg-[var(--navy)] text-white" : "bg-[var(--surface-subtle)] text-[var(--teal)]"}`}
          >
            {commodity.symbol}
          </span>
          <div>
            <div className="text-xs font-bold">{commodity.name}</div>
            <div className="text-[9px] text-[var(--ink-muted)]">
              {commodity.category}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3.5">
        <div className="text-xs font-bold">
          {commodity.currency === "USD" ? "$" : `${commodity.currency} `}
          {commodity.price.toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}
        </div>
        <div className="text-[9px] text-[var(--ink-muted)]">
          /{commodity.unit}
        </div>
      </td>
      <td className="px-3 py-3.5">
        <ChangeValue value={commodity.change24h} />
      </td>
      <td className="px-3 py-3.5">
        <ChangeValue value={commodity.change7d} />
      </td>
      <td className="px-3 py-3.5">
        <ChangeValue value={commodity.change30d} />
      </td>
      <td className="px-3 py-3.5">
        <TrendIndicator
          direction={commodity.trend}
          value={
            commodity.trend === "flat"
              ? "Mixed"
              : commodity.trend === "up"
                ? "Rising"
                : "Falling"
          }
        />
      </td>
      <td className="px-3 py-3.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold capitalize text-[var(--ink)]">
          {commodity.forecastDirection === "higher" ? (
            <ArrowUpRight
              aria-hidden="true"
              className="text-[var(--teal)]"
              size={13}
            />
          ) : commodity.forecastDirection === "lower" ? (
            <ArrowDownRight
              aria-hidden="true"
              className="text-[var(--danger)]"
              size={13}
            />
          ) : (
            <ArrowRight
              aria-hidden="true"
              className="text-[var(--ink-muted)]"
              size={13}
            />
          )}
          {commodity.forecastDirection}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="ml-auto flex w-24 items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
            <div
              className="h-full rounded-full bg-[var(--teal)]"
              style={{ width: `${commodity.confidence}%` }}
            />
          </div>
          <span className="text-[9px] font-bold">{commodity.confidence}%</span>
        </div>
      </td>
    </tr>
  );
}

function ChangeValue({ value }: { readonly value: number }) {
  const direction: TrendDirection =
    value > 0.15 ? "up" : value < -0.15 ? "down" : "flat";
  return (
    <TrendIndicator
      direction={direction}
      value={`${value > 0 ? "+" : ""}${value.toFixed(1)}%`}
    />
  );
}

function MarketPulseScore({
  className,
  onInspect,
}: {
  readonly className?: string;
  readonly onInspect: () => void;
}) {
  const score = 34;
  return (
    <DoraCard
      className={className}
      contentClassName="px-5 pb-5"
      description="Weighted aggregate from -100 bearish to +100 bullish"
      title="Market Pulse"
      action={
        <button
          aria-label="Inspect market pulse"
          className="grid h-8 w-8 place-items-center rounded-[7px] border border-[var(--line)]"
          onClick={onInspect}
          type="button"
        >
          <Eye aria-hidden="true" size={14} />
        </button>
      }
    >
      <button className="w-full text-left" onClick={onInspect} type="button">
        <div className="mt-2 flex items-end justify-between">
          <div>
            <AnimatedNumber
              className="font-serif text-6xl font-medium text-[var(--navy)]"
              format={(value) => `${value > 0 ? "+" : ""}${Math.round(value)}`}
              value={score}
            />
            <div className="mt-1 text-xs font-bold text-[var(--teal)]">
              Moderately bullish
            </div>
          </div>
          <ConfidenceIndicator value={87} />
        </div>
        <div className="relative mt-7 h-2 rounded-full bg-gradient-to-r from-[var(--danger)] via-[var(--surface-subtle)] to-[var(--teal)]">
          <motion.span
            animate={{ left: `${(score + 100) / 2}%` }}
            className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--navy)] ring-2 ring-white"
            initial={false}
          />
        </div>
        <div className="mt-2 flex justify-between text-[8px] font-bold uppercase text-[var(--ink-muted)]">
          <span>-100 Bearish</span>
          <span>Neutral</span>
          <span>+100 Bullish</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[var(--line-soft)] pt-4">
          {[
            ["Energy", "+21"],
            ["Metals", "+6"],
            ["Agriculture", "+7"],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-[9px] text-[var(--ink-muted)]">{label}</div>
              <div className="mt-1 text-xs font-bold text-[var(--teal)]">
                {value}
              </div>
            </div>
          ))}
        </div>
      </button>
    </DoraCard>
  );
}

function DoraOutlook({
  className,
  onInspect,
}: {
  readonly className?: string;
  readonly onInspect: () => void;
}) {
  return (
    <DoraCard
      className={className}
      contentClassName="px-5 pb-5 sm:px-7 sm:pb-7"
      elevated
    >
      <button className="w-full text-left" onClick={onInspect} type="button">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--cyan)]">
            <Sparkles aria-hidden="true" size={14} /> DORA Outlook
          </div>
          <span className="text-[9px] text-[var(--ink-muted)]">
            Validated 08:42 UTC
          </span>
        </div>
        <h2 className="mt-5 max-w-4xl font-serif text-3xl font-medium leading-[1.1] text-[var(--navy)]">
          Near-term firmness is likely. Beyond 30 days, the range matters more
          than the midpoint.
        </h2>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--ink-muted)]">
          Energy, shipping and geopolitical signals support a bullish near-term
          bias. Softer manufacturing and macro indicators limit conviction,
          while uncertainty widens quickly across the 30-day and 90-day
          horizons.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-4">
          <div className="flex items-center gap-2">
            <SourceBadge source="6 sources" />
            <FreshnessIndicator label="Current" status="fresh" />
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--blue)]">
            Evidence and reasoning <ChevronRight aria-hidden="true" size={13} />
          </span>
        </div>
      </button>
    </DoraCard>
  );
}

function buildOutlookChart(horizon: (typeof outlookHorizons)[number]) {
  const steps = 8;
  return Array.from({ length: steps }, (_, index) => {
    const progress = index / (steps - 1);
    const center = 100 + (horizon.projected - 100) * progress;
    const low = 100 + (horizon.low - 100) * progress;
    const high = 100 + (horizon.high - 100) * progress;
    return {
      label: index === 0 ? "Now" : `${Math.round(progress * 100)}%`,
      actual: index === 0 ? 100 : null,
      forecast: index === 0 ? 100 : Number(center.toFixed(1)),
      lower: Number(low.toFixed(1)),
      upper: Number(high.toFixed(1)),
    };
  });
}

function PriceOutlook({
  className,
  commodity,
  horizon,
  onHorizon,
  onInspect,
  selectedHorizon,
}: {
  readonly className?: string;
  readonly commodity: CommandCommodity;
  readonly horizon: (typeof outlookHorizons)[number];
  readonly onHorizon: (value: OutlookHorizon) => void;
  readonly onInspect: () => void;
  readonly selectedHorizon: OutlookHorizon;
}) {
  return (
    <div className={className}>
      <ForecastCard
        currentValue={100}
        data={buildOutlookChart(horizon)}
        description={`${commodity.name} normalized directional outlook. The shaded interval widens with uncertainty.`}
        horizon={horizon.label}
        projectedValue={horizon.projected}
        title="Price Outlook"
        unit="index"
      />
      <div className="-mt-16 relative z-10 ml-5 flex w-fit gap-1 rounded-[8px] border border-[var(--line)] bg-white/90 p-1 shadow-[var(--shadow-control)] backdrop-blur">
        {outlookHorizons.map((item) => (
          <button
            aria-pressed={selectedHorizon === item.id}
            className={`h-7 rounded-[6px] px-2.5 text-[9px] font-bold ${selectedHorizon === item.id ? "bg-[var(--navy)] text-white" : "text-[var(--ink-muted)]"}`}
            key={item.id}
            onClick={() => onHorizon(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <button
        className="relative z-10 mt-3 ml-5 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--blue)]"
        onClick={onInspect}
        type="button"
      >
        <FileText aria-hidden="true" size={12} /> Explain range
      </button>
    </div>
  );
}

function DriverSummary({
  className,
  onInspect,
}: {
  readonly className?: string;
  readonly onInspect: (title: string, summary: string) => void;
}) {
  return (
    <DoraCard
      className={className}
      contentClassName="px-5 pb-5"
      description="Net contribution to the +34 pulse"
      title="Driver balance"
    >
      <div className="space-y-3">
        {topMarketDrivers.slice(0, 5).map((driver) => (
          <button
            className="group flex w-full items-center gap-3 text-left"
            key={driver.category}
            onClick={() => onInspect(driver.category, driver.headline)}
            type="button"
          >
            <span className="w-20 text-[10px] font-bold">
              {driver.category}
            </span>
            <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
              <span
                className={`absolute inset-y-0 rounded-full ${driver.contribution >= 0 ? "left-1/2 bg-[var(--teal)]" : "right-1/2 bg-[var(--danger)]"}`}
                style={{ width: `${Math.abs(driver.contribution) * 2}%` }}
              />
            </span>
            <span
              className={`w-8 text-right text-[9px] font-bold ${driver.contribution >= 0 ? "text-[var(--teal)]" : "text-[var(--danger)]"}`}
            >
              {driver.contribution > 0 ? "+" : ""}
              {driver.contribution}
            </span>
          </button>
        ))}
      </div>
      <button
        className="mt-5 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--blue)]"
        onClick={() =>
          onInspect(
            "All market drivers",
            "Ten driver categories explain the current aggregate market score.",
          )
        }
        type="button"
      >
        View all drivers <ArrowRight aria-hidden="true" size={12} />
      </button>
    </DoraCard>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="mb-4">
      <div className="text-[9px] font-bold uppercase text-[var(--teal)]">
        {eyebrow}
      </div>
      <h2 className="mt-1 font-serif text-2xl font-medium text-[var(--navy)]">
        {title}
      </h2>
      <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
        {description}
      </p>
    </div>
  );
}

function TopDriversSection({
  onInspect,
}: {
  readonly onInspect: (title: string, summary: string) => void;
}) {
  return (
    <section className="mt-8">
      <SectionHeading
        description="Ranked by contribution to the current aggregate market state"
        eyebrow="Why is it happening?"
        title="Top Market Drivers"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {topMarketDrivers.map((driver) => (
          <button
            className="dora-card min-h-[144px] rounded-[12px] border border-[var(--line)] bg-[var(--surface)] p-4 text-left hover:-translate-y-0.5 hover:border-[var(--line-strong)]"
            key={driver.category}
            onClick={() =>
              onInspect(`${driver.category} driver`, driver.headline)
            }
            type="button"
          >
            <div className="flex items-center justify-between">
              <RiskBadge level={driver.risk} />
              <span
                className={`font-serif text-xl ${driver.contribution >= 0 ? "text-[var(--teal)]" : "text-[var(--danger)]"}`}
              >
                {driver.contribution > 0 ? "+" : ""}
                {driver.contribution}
              </span>
            </div>
            <div className="mt-4 text-xs font-bold">{driver.category}</div>
            <p className="mt-1 text-[10px] leading-4 text-[var(--ink-muted)]">
              {driver.headline}
            </p>
            <div className="mt-3 text-[9px] font-semibold text-[var(--blue)]">
              {driver.evidence}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function EmergingRisksSection({
  onInspect,
}: {
  readonly onInspect: (title: string, summary: string) => void;
}) {
  return (
    <section className="mt-8">
      <SectionHeading
        description="Probability describes a range; impact and urgency determine management priority"
        eyebrow="What should management pay attention to?"
        title="Emerging Risks"
      />
      <DoraCard contentClassName="divide-y divide-[var(--line-soft)]">
        <div className="hidden grid-cols-[52px_1.5fr_130px_100px_90px_110px] gap-3 border-b border-[var(--line-soft)] px-5 py-3 text-[9px] font-bold uppercase text-[var(--ink-muted)] lg:grid">
          <span>Rank</span>
          <span>Risk</span>
          <span>Probability</span>
          <span>Impact</span>
          <span>Urgency</span>
          <span>Confidence</span>
        </div>
        {rankedRisks.map((risk) => (
          <button
            className="grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--surface-subtle)] lg:grid-cols-[52px_1.5fr_130px_100px_90px_110px] lg:items-center"
            key={risk.rank}
            onClick={() => onInspect(risk.title, risk.summary)}
            type="button"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-[var(--navy)] text-xs font-bold text-white">
              {risk.rank}
            </span>
            <span>
              <span className="block text-xs font-bold">{risk.title}</span>
              <span className="mt-1 block text-[10px] leading-4 text-[var(--ink-muted)]">
                {risk.summary}
              </span>
            </span>
            <span className="text-[10px] font-semibold text-[var(--ink-muted)]">
              <span className="mr-1 lg:hidden">Probability:</span>
              {risk.probability}
            </span>
            <RiskBadge label={risk.impact} level={risk.risk} />
            <span className="inline-flex items-center gap-1 text-[10px] font-bold">
              <Clock3 aria-hidden="true" size={12} />
              {risk.urgency}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                <span
                  className="block h-full rounded-full bg-[var(--teal)]"
                  style={{ width: `${risk.confidence}%` }}
                />
              </span>
              <span className="text-[9px] font-bold">{risk.confidence}%</span>
            </span>
          </button>
        ))}
      </DoraCard>
    </section>
  );
}

function LatestIntelligence({
  className,
  items,
  onInspect,
  query,
}: {
  readonly className?: string;
  readonly items: readonly (typeof latestCommandIntelligence)[number][];
  readonly onInspect: (title: string, summary: string) => void;
  readonly query: string;
}) {
  return (
    <DoraCard
      className={className}
      contentClassName="divide-y divide-[var(--line-soft)]"
      description="Recent validated news, signals and operational changes"
      emptyDescription={`No intelligence matches ${query || "the current filter"}.`}
      emptyTitle="No matching intelligence"
      state={items.length ? "ready" : "empty"}
      title="Latest Intelligence"
    >
      {items.map((item) => (
        <button
          className="grid w-full grid-cols-[34px_1fr_auto] gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--surface-subtle)]"
          key={item.id}
          onClick={() => onInspect(item.title, item.summary)}
          type="button"
        >
          <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-[var(--surface-subtle)] text-[var(--teal)]">
            {item.type === "news" ? (
              <Newspaper aria-hidden="true" size={14} />
            ) : item.type === "operations" ? (
              <Factory aria-hidden="true" size={14} />
            ) : (
              <Activity aria-hidden="true" size={14} />
            )}
          </span>
          <span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold">{item.title}</span>
              <RiskBadge level={item.risk} />
            </span>
            <span className="mt-1 block text-[10px] leading-4 text-[var(--ink-muted)]">
              {item.summary}
            </span>
            <span className="mt-2 flex items-center gap-2">
              <SourceBadge source={item.source} />
              <span className="text-[9px] text-[var(--ink-muted)]">
                {item.time} ago
              </span>
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="mt-1 text-[var(--ink-faint)]"
            size={14}
          />
        </button>
      ))}
    </DoraCard>
  );
}

function ManagementAttention({
  className,
  onInspect,
}: {
  readonly className?: string;
  readonly onInspect: (title: string, summary: string) => void;
}) {
  return (
    <DoraCard
      className={className}
      contentClassName="px-5 pb-5"
      description="Only items requiring executive awareness or action"
      title="Management Attention"
      action={
        <BellRing
          aria-hidden="true"
          className="text-[var(--amber)]"
          size={17}
        />
      }
      elevated
    >
      <div className="space-y-3">
        {managementAttention.map((item) => (
          <button
            className="w-full rounded-[10px] border border-[var(--line)] bg-white/65 p-4 text-left transition-colors hover:border-[var(--line-strong)] hover:bg-white"
            key={item.title}
            onClick={() =>
              onInspect(
                item.title,
                `${item.why} Recommended action: ${item.action}`,
              )
            }
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <RiskBadge label={item.priority} level={item.risk} />
              <span className="text-[9px] font-bold text-[var(--ink-muted)]">
                {item.due}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-bold">{item.title}</h3>
            <p className="mt-1 text-[10px] leading-4 text-[var(--ink-muted)]">
              {item.action}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-[var(--line-soft)] pt-3">
              <span className="text-[9px] text-[var(--ink-muted)]">
                Owner: {item.owner}
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[var(--blue)]">
                Inspect <ChevronRight aria-hidden="true" size={11} />
              </span>
            </div>
          </button>
        ))}
      </div>
    </DoraCard>
  );
}
