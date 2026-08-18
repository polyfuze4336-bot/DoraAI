"use client";

import * as Tabs from "@radix-ui/react-tabs";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { IntelligenceDomain } from "@dora/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Boxes,
  ChartNoAxesCombined,
  Download,
  Factory,
  FileText,
  LayoutDashboard,
  Menu,
  Newspaper,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";

import { CommandSidebar } from "@/components/command-sidebar";
import {
  AgentActivity,
  AnimatedNumber,
  DoraCard,
  EvidenceDrawer,
  ExecutiveBriefCard,
  ForecastCard,
  FreshnessIndicator,
  InsightCard,
  MarketPulse,
  NotificationPanel,
  PriceTicker,
  RiskBadge,
  ScenarioCard,
  SignalCard,
  SourceBadge,
  TrendIndicator,
} from "@/components/design-system";
import {
  commodityRows,
  dashboardNotifications,
  evidenceItems,
  forecastSeries,
  manufacturingSites,
  marketPulseItems,
  newsItems,
  reasoningActivity,
  riskItems,
} from "@/lib/dashboard-data";

interface DoraExecutiveDashboardProps {
  readonly appName: string;
  readonly demoMode: boolean;
}

const domainNavigation = [
  { id: "commodity-price", label: "Prices", icon: ChartNoAxesCombined },
  { id: "news-updates", label: "News", icon: Newspaper },
  { id: "emerging-risk", label: "Risk", icon: ShieldAlert },
  { id: "market-intelligence", label: "Intelligence", icon: Sparkles },
  { id: "manufacturing-status", label: "Manufacturing", icon: Factory },
] satisfies ReadonlyArray<{
  id: IntelligenceDomain;
  label: string;
  icon: typeof Activity;
}>;

const executiveBrief =
  "Crude strength and freight constraints are narrowing the sourcing window for Rotterdam. Current inventory cover keeps the exposure manageable for seven to ten days, while copper and natural gas signals remain inside approved tolerance bands. Validate transit assumptions and compare a modest forward-cover scenario before Friday.";

export function DoraExecutiveDashboard({
  appName,
  demoMode,
}: DoraExecutiveDashboardProps) {
  const reducedMotion = useReducedMotion();
  const [activeDomain, setActiveDomain] =
    useState<IntelligenceDomain>("commodity-price");
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("WTI");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const [lastRefresh, setLastRefresh] = useState("08:42 UTC");
  const searchParams = useSearchParams();

  useEffect(() => {
    const requestedDomain = searchParams.get("domain");
    if (domainNavigation.some((item) => item.id === requestedDomain)) {
      setActiveDomain(requestedDomain as IntelligenceDomain);
    }
  }, [searchParams]);

  function refresh() {
    startTransition(() => {
      setLastRefresh(
        `${new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
          hour12: false,
        }).format(new Date())} UTC`,
      );
    });
  }

  const filteredNews = deferredQuery
    ? newsItems.filter((item) =>
        `${item.title} ${item.source} ${item.commodity}`
          .toLowerCase()
          .includes(deferredQuery),
      )
    : newsItems;

  return (
    <Tooltip.Provider delayDuration={220}>
      <div className="min-h-screen xl:grid xl:grid-cols-[256px_minmax(0,1fr)]">
        <CommandSidebar
          activeDomain={activeDomain}
          appName={appName}
          demoMode={demoMode}
          onClose={() => setNavigationOpen(false)}
          open={navigationOpen}
        />

        <main className="min-w-0 xl:col-start-2">
          <ExecutiveTopBar
            appName={appName}
            lastRefresh={lastRefresh}
            onMenu={() => setNavigationOpen(true)}
            onRefresh={refresh}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          <TabletNavigation
            activeDomain={activeDomain}
            onSelect={setActiveDomain}
          />

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-[1520px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <ExecutiveHeader onEvidence={() => setEvidenceOpen(true)} />
            <ExecutiveMetrics />

            <Tabs.Root
              onValueChange={(value) =>
                setActiveDomain(value as IntelligenceDomain)
              }
              value={activeDomain}
            >
              <Tabs.Content value="commodity-price">
                <PriceIntelligenceView
                  onEvidence={() => setEvidenceOpen(true)}
                  onSelectTicker={setSelectedSymbol}
                  selectedSymbol={selectedSymbol}
                />
              </Tabs.Content>
              <Tabs.Content value="news-updates">
                <NewsIntelligenceView
                  items={filteredNews}
                  onEvidence={() => setEvidenceOpen(true)}
                  query={searchQuery}
                />
              </Tabs.Content>
              <Tabs.Content value="emerging-risk">
                <RiskIntelligenceView
                  onEvidence={() => setEvidenceOpen(true)}
                />
              </Tabs.Content>
              <Tabs.Content value="market-intelligence">
                <MarketIntelligenceView
                  onEvidence={() => setEvidenceOpen(true)}
                />
              </Tabs.Content>
              <Tabs.Content value="manufacturing-status">
                <ManufacturingIntelligenceView
                  onEvidence={() => setEvidenceOpen(true)}
                />
              </Tabs.Content>
            </Tabs.Root>
          </motion.div>
        </main>

        <EvidenceDrawer
          evidence={evidenceItems}
          onOpenChange={setEvidenceOpen}
          open={evidenceOpen}
          title="Morning brief evidence"
        />
      </div>
    </Tooltip.Provider>
  );
}

function ExecutiveTopBar({
  appName,
  lastRefresh,
  onMenu,
  onRefresh,
  searchQuery,
  setSearchQuery,
}: {
  readonly appName: string;
  readonly lastRefresh: string;
  readonly onMenu: () => void;
  readonly onRefresh: () => void;
  readonly searchQuery: string;
  readonly setSearchQuery: (value: string) => void;
}) {
  return (
    <header
      className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b border-white/65 bg-[rgba(248,249,246,.78)] px-4 shadow-[var(--shadow-hairline)] backdrop-blur-xl sm:px-6 lg:px-8"
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
      <div className="hidden sm:block xl:hidden">
        <Brand appName={appName} />
      </div>
      <Link
        className="dora-floating-control hidden h-10 items-center gap-2 px-3 text-[10px] font-bold md:inline-flex xl:hidden"
        href="/dashboard"
      >
        <LayoutDashboard aria-hidden="true" size={14} />
        Command centre
      </Link>
      <label className="relative min-w-0 max-w-[520px] flex-1 sm:ml-2 xl:ml-0">
        <span className="sr-only">Search DORA intelligence</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
          size={15}
        />
        <input
          className="h-10 w-full rounded-[9px] border border-white/70 bg-white/60 pl-9 pr-3 text-xs text-[var(--ink)] shadow-[var(--shadow-control)] outline-none backdrop-blur-lg placeholder:text-[var(--ink-faint)] focus:border-[var(--cyan)] focus:bg-white"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search markets, signals, sources"
          type="search"
          value={searchQuery}
        />
      </label>
      <div className="ml-auto hidden text-right lg:block">
        <div className="text-[10px] font-bold text-[var(--ink)]">
          Updated {lastRefresh}
        </div>
        <div className="mt-0.5 text-[9px] text-[var(--ink-muted)]">
          96% sources current
        </div>
      </div>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            aria-label="Refresh dashboard"
            className="dora-floating-control grid h-10 w-10 place-items-center"
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={16} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="rounded-[6px] bg-[var(--navy)] px-2.5 py-1.5 text-[10px] text-white shadow-lg"
            sideOffset={6}
          >
            Refresh intelligence
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <NotificationPanel notifications={dashboardNotifications} />
    </header>
  );
}

function TabletNavigation({
  activeDomain,
  onSelect,
}: {
  readonly activeDomain: IntelligenceDomain;
  readonly onSelect: (domain: IntelligenceDomain) => void;
}) {
  return (
    <nav
      aria-label="Intelligence domains"
      className="sticky top-[76px] z-20 hidden border-b border-[var(--line)] bg-[rgba(248,249,246,.88)] px-6 backdrop-blur-xl md:block xl:hidden"
      data-print-hidden="true"
    >
      <div className="mx-auto flex max-w-[1520px] gap-1 overflow-x-auto">
        {domainNavigation.map((item) => {
          const Icon = item.icon;
          const active = activeDomain === item.id;
          return (
            <button
              aria-current={active ? "page" : undefined}
              className={`relative flex h-12 shrink-0 items-center gap-2 px-3 text-xs font-bold transition-colors ${active ? "text-[var(--navy)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"} after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-transparent ${active ? "after:bg-[var(--teal)]" : ""}`}
              key={item.id}
              onClick={() => onSelect(item.id)}
              type="button"
            >
              <Icon aria-hidden="true" size={14} /> {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Brand({
  appName,
  inverse = false,
}: {
  readonly appName: string;
  readonly inverse?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid h-9 w-9 place-items-center rounded-[9px] font-serif text-xl font-semibold shadow-sm ${inverse ? "bg-white text-[var(--navy)]" : "bg-[var(--navy)] text-white"}`}
      >
        D
      </div>
      <div>
        <div
          className={`text-sm font-extrabold ${inverse ? "text-white" : "text-[var(--navy)]"}`}
        >
          {appName}
        </div>
        <div
          className={`text-[9px] ${inverse ? "text-white/40" : "text-[var(--ink-muted)]"}`}
        >
          Commodity Intelligence
        </div>
      </div>
    </div>
  );
}

function ExecutiveHeader({ onEvidence }: { readonly onEvidence: () => void }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--teal)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)] shadow-[0_0_0_4px_var(--teal-soft)]" />
          Executive decision brief
        </div>
        <h1 className="max-w-3xl font-serif text-[34px] font-medium leading-[1.04] text-[var(--navy)] sm:text-[42px]">
          Markets are tightening. Your decision window is still open.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
          Energy and freight need attention; broader portfolio exposure remains
          contained.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white/70 px-3 text-xs font-bold text-[var(--ink)] shadow-[var(--shadow-control)] backdrop-blur-lg hover:bg-white"
          onClick={onEvidence}
          type="button"
        >
          <FileText aria-hidden="true" size={14} /> Evidence
        </button>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[var(--navy)] px-4 text-xs font-bold text-white shadow-[var(--shadow-control)] hover:bg-[var(--navy-soft)]"
          onClick={() => window.print()}
          type="button"
        >
          <Download aria-hidden="true" size={14} /> Export brief
        </button>
      </div>
    </div>
  );
}

function ExecutiveMetrics() {
  const metrics = [
    {
      label: "Portfolio exposure",
      value: 18,
      suffix: "%",
      note: "Within tolerance",
      tone: "low",
    },
    {
      label: "Material signals",
      value: 7,
      suffix: "",
      note: "+2 this week",
      tone: "medium",
    },
    {
      label: "Decision window",
      value: 9,
      suffix: " days",
      note: "Rotterdam",
      tone: "high",
    },
    {
      label: "Source confidence",
      value: 92,
      suffix: "%",
      note: "6 sources",
      tone: "info",
    },
  ] as const;

  return (
    <DoraCard
      className="mb-8"
      contentClassName="grid divide-y divide-[var(--line-soft)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"
    >
      {metrics.map((metric) => (
        <div className="min-h-[112px] p-5" key={metric.label}>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-semibold text-[var(--ink-muted)]">
              {metric.label}
            </span>
            <RiskBadge level={metric.tone} />
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="font-serif text-3xl font-medium text-[var(--navy)]">
              <AnimatedNumber value={metric.value} />
              <span className="text-lg">{metric.suffix}</span>
            </div>
            <span className="text-[9px] font-bold text-[var(--ink-muted)]">
              {metric.note}
            </span>
          </div>
        </div>
      ))}
    </DoraCard>
  );
}

function PriceIntelligenceView({
  onEvidence,
  onSelectTicker,
  selectedSymbol,
}: {
  readonly onEvidence: () => void;
  readonly onSelectTicker: (symbol: string) => void;
  readonly selectedSymbol: string;
}) {
  return (
    <div className="space-y-6">
      <section
        aria-label="Priority prices"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {commodityRows.map((item, index) => (
          <PriceTicker
            change={item.change}
            direction={item.direction}
            key={item.symbol}
            name={item.name}
            onClick={() => onSelectTicker(item.symbol)}
            price={[80.82, 2.91, 4.47, 2614][index] ?? 0}
            selected={selectedSymbol === item.symbol}
            symbol={item.symbol}
            unit={
              item.symbol === "AL"
                ? "tonne"
                : item.symbol === "NG"
                  ? "MMBtu"
                  : item.symbol === "CU"
                    ? "lb"
                    : "barrel"
            }
          />
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-12">
        <ExecutiveBriefCard
          brief={executiveBrief}
          className="lg:col-span-8"
          confidence={92}
          generatedAt="08:40 UTC"
          onEvidence={onEvidence}
          sourceCount={6}
          title="Crude and freight are converging on the Rotterdam coverage window."
        />
        <AgentActivity
          activities={reasoningActivity}
          className="lg:col-span-4"
        />

        <ForecastCard
          className="lg:col-span-8"
          currentValue={80.82}
          data={forecastSeries}
          description="Deterministic drift baseline with historical residual interval"
          horizon="14-day horizon"
          projectedValue={82.6}
          title="WTI baseline outlook"
          unit="USD/bbl"
        />
        <MarketPulse className="lg:col-span-4" items={marketPulseItems} />

        <SignalCard
          change="+14 pts"
          className="lg:col-span-4"
          direction="up"
          label="Freight pressure"
          risk="high"
          summary="Two monitored routes now exceed the 90-day lead-time band."
          unit="index"
          value={78}
        />
        <SignalCard
          change="+6.8%"
          className="lg:col-span-4"
          direction="up"
          label="Price volatility"
          risk="medium"
          summary="WTI volatility is elevated but remains below the escalation threshold."
          unit="30d"
          value={24}
        />
        <SignalCard
          change="Stable"
          className="lg:col-span-4"
          direction="flat"
          label="Manufacturing cover"
          risk="low"
          summary="Network cover is healthy; Rotterdam remains the only constrained site."
          unit="days"
          value={17}
        />

        <ScenarioCard
          className="lg:col-span-12"
          description="Conditional impact of extending crude cover before the current freight window closes"
          impacts={[
            { label: "Landed cost", value: "+1.8%", direction: "up" },
            { label: "Shortage exposure", value: "-42%", direction: "down" },
            { label: "Working capital", value: "+$1.2m", direction: "up" },
          ]}
          inputs={[
            { label: "Forward cover", value: "+10%" },
            { label: "Freight lead time", value: "+3 days" },
            { label: "WTI reference", value: "$82.60" },
            { label: "Production plan", value: "Current" },
          ]}
          title="Extend Rotterdam cover"
        />
      </div>
    </div>
  );
}

function NewsIntelligenceView({
  items,
  onEvidence,
  query,
}: {
  readonly items: readonly (typeof newsItems)[number][];
  readonly onEvidence: () => void;
  readonly query: string;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <DoraCard
        className="lg:col-span-8"
        contentClassName="divide-y divide-[var(--line-soft)]"
        description="Deduplicated and linked to monitored exposure"
        emptyDescription={`No source updates match ${query || "the current filter"}.`}
        emptyTitle="No matching updates"
        state={items.length ? "ready" : "empty"}
        title="Live news and updates"
      >
        {items.map((item) => (
          <article
            className="grid gap-3 px-5 py-5 transition-colors hover:bg-[var(--surface-subtle)] sm:grid-cols-[110px_1fr_auto] sm:items-center"
            key={item.title}
          >
            <div>
              <SourceBadge source={item.source} />
              <div className="mt-2 text-[9px] text-[var(--ink-muted)]">
                {item.time} ago
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold leading-5">{item.title}</h3>
              <p className="mt-1 text-[10px] text-[var(--ink-muted)]">
                {item.commodity}
              </p>
            </div>
            <ArrowRight
              aria-hidden="true"
              className="hidden text-[var(--ink-muted)] sm:block"
              size={15}
            />
          </article>
        ))}
      </DoraCard>
      <InsightCard
        className="lg:col-span-4"
        confidence={88}
        evidenceCount={4}
        eyebrow="News intelligence"
        onEvidence={onEvidence}
        source="4 sources"
        summary="Inventory and shipping updates reinforce the current energy exposure; no portfolio-wide shift is indicated."
        title="Source events support focused action, not broad escalation."
      />
    </div>
  );
}

function RiskIntelligenceView({
  onEvidence,
}: {
  readonly onEvidence: () => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <DoraCard
        className="lg:col-span-8"
        contentClassName="divide-y divide-[var(--line-soft)]"
        description="Likelihood, horizon and operational exposure"
        title="Emerging risk register"
      >
        {riskItems.map((risk) => (
          <div
            className="grid gap-3 px-5 py-5 sm:grid-cols-[90px_1fr_100px] sm:items-start"
            key={risk.title}
          >
            <RiskBadge
              level={risk.level.toLowerCase() as "high" | "medium" | "low"}
            />
            <div>
              <h3 className="text-sm font-bold">{risk.title}</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                {risk.detail}
              </p>
            </div>
            <span className="text-[10px] font-bold text-[var(--ink-muted)] sm:text-right">
              {risk.horizon}
            </span>
          </div>
        ))}
      </DoraCard>
      <InsightCard
        className="lg:col-span-4"
        confidence={86}
        evidenceCount={5}
        eyebrow="Risk synthesis"
        onEvidence={onEvidence}
        source="DORA risk"
        summary="Freight lead-time exposure intersects a constrained feedstock position inside the next 21 days."
        title="One risk needs ownership."
      />
      <ScenarioCard
        className="lg:col-span-12"
        defaultOpen
        description="Stress the constrained route against inventory and production assumptions"
        impacts={[
          { label: "Continuity risk", value: "High", direction: "up" },
          { label: "Inventory buffer", value: "-4 days", direction: "down" },
          { label: "Expedite cost", value: "+$640k", direction: "up" },
        ]}
        inputs={[
          { label: "Route delay", value: "+7 days" },
          { label: "Site utilization", value: "88%" },
          { label: "Alternative supply", value: "Unavailable" },
          { label: "Demand plan", value: "Base" },
        ]}
        title="Gulf route disruption"
      />
    </div>
  );
}

function MarketIntelligenceView({
  onEvidence,
}: {
  readonly onEvidence: () => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <ExecutiveBriefCard
        brief={executiveBrief}
        className="lg:col-span-8"
        confidence={92}
        defaultStreaming={false}
        generatedAt="08:40 UTC"
        onEvidence={onEvidence}
        sourceCount={6}
        title="Focused energy action is justified; a portfolio-wide sourcing shift is not."
      />
      <MarketPulse className="lg:col-span-4" items={marketPulseItems} />
      <InsightCard
        className="lg:col-span-6"
        confidence={84}
        evidenceCount={7}
        eyebrow="Market regime"
        onEvidence={onEvidence}
        source="DORA composite"
        summary="Supply tightness and price pressure are elevated, while demand remains balanced and operational exposure is localized."
        title="The market is firm, not yet structurally dislocated."
      />
      <AgentActivity activities={reasoningActivity} className="lg:col-span-6" />
    </div>
  );
}

function ManufacturingIntelligenceView({
  onEvidence,
}: {
  readonly onEvidence: () => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <DoraCard
        action={
          <Boxes
            aria-hidden="true"
            className="text-[var(--ink-muted)]"
            size={17}
          />
        }
        className="lg:col-span-8"
        contentClassName="divide-y divide-[var(--line-soft)]"
        description="Site status, material coverage and utilization"
        title="Manufacturing continuity"
      >
        {manufacturingSites.map((site) => (
          <div
            className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_120px_110px_1.2fr] sm:items-center"
            key={site.site}
          >
            <div>
              <div className="text-sm font-bold">{site.site}</div>
              <div className="mt-1 text-[10px] text-[var(--ink-muted)]">
                Production network
              </div>
            </div>
            <RiskBadge
              level={site.status === "Constrained" ? "medium" : "low"}
              label={site.status}
            />
            <div>
              <div className="text-[10px] text-[var(--ink-muted)]">
                Material cover
              </div>
              <div className="mt-1 text-xs font-bold">{site.coverage}</div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-[10px]">
                <span className="text-[var(--ink-muted)]">Utilization</span>
                <span className="font-bold">{site.utilization}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                <div
                  className="h-full rounded-full bg-[var(--teal)]"
                  style={{ width: `${site.utilization}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </DoraCard>
      <div className="grid gap-5 lg:col-span-4">
        <SignalCard
          change="-3 days"
          direction="down"
          label="Critical material cover"
          onEvidence={onEvidence}
          risk="medium"
          summary="Rotterdam cover moved lower after the latest production-plan update."
          unit="days"
          value={9}
        />
        <DoraCard contentClassName="p-5" title="Network posture">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--ink-muted)]">
                Healthy sites
              </span>
              <span className="text-sm font-bold">2 of 3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--ink-muted)]">
                Average utilization
              </span>
              <TrendIndicator direction="up" value="90.3%" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--ink-muted)]">
                Data freshness
              </span>
              <FreshnessIndicator label="Current" status="fresh" />
            </div>
          </div>
        </DoraCard>
      </div>
    </div>
  );
}
