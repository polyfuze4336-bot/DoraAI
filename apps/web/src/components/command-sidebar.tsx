"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BellRing,
  BrainCircuit,
  ChartNoAxesCombined,
  Clock3,
  Factory,
  FileText,
  Gauge,
  Globe2,
  Library,
  Newspaper,
  Radar,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  X,
} from "lucide-react";

interface CommandNavItem {
  readonly label: string;
  readonly icon: typeof Activity;
  readonly href: string;
  readonly domain?: string;
}

const navigation: ReadonlyArray<{
  readonly section: string;
  readonly items: readonly CommandNavItem[];
}> = [
  {
    section: "Overview",
    items: [{ label: "Dashboard", icon: Gauge, href: "/dashboard" }],
  },
  {
    section: "Intelligence",
    items: [
      {
        label: "Market",
        icon: ChartNoAxesCombined,
        href: "/?domain=market-intelligence",
        domain: "market-intelligence",
      },
      {
        label: "Commodities",
        icon: Activity,
        href: "/?domain=commodity-price",
        domain: "commodity-price",
      },
      {
        label: "News",
        icon: Newspaper,
        href: "/?domain=news-updates",
        domain: "news-updates",
      },
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
        domain: "market-intelligence",
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
    items: [{ label: "Forecast & health", icon: Target, href: "/performance" }],
  },
  {
    section: "Administration",
    items: [{ label: "Settings", icon: Settings, href: "/settings" }],
  },
];

export function CommandSidebar({
  appName,
  demoMode,
  onClose,
  open,
  activeDomain,
}: {
  readonly appName: string;
  readonly demoMode: boolean;
  readonly onClose: () => void;
  readonly open: boolean;
  readonly activeDomain?: string;
}) {
  const pathname = usePathname();

  function isActive(item: CommandNavItem): boolean {
    if (item.domain) {
      return pathname === "/" && activeDomain === item.domain;
    }
    if (item.href === "/dashboard?ask=1") return false;
    if (item.href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === item.href;
  }

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
                    const active = isActive(item);
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
