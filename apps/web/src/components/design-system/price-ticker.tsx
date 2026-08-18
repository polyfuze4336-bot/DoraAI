"use client";

import { AnimatedNumber } from "./animated-number";
import { DoraCard } from "./dora-card";
import type { SurfaceState } from "./foundation";
import {
  FreshnessIndicator,
  TrendIndicator,
  type TrendDirection,
} from "./indicators";
import { cn } from "./utils";

interface PriceTickerProps {
  readonly symbol: string;
  readonly name: string;
  readonly price: number;
  readonly currency?: string;
  readonly unit: string;
  readonly change: string;
  readonly direction: TrendDirection;
  readonly state?: SurfaceState;
  readonly selected?: boolean;
  readonly onClick?: () => void;
}

export function PriceTicker({
  symbol,
  name,
  price,
  currency = "USD",
  unit,
  change,
  direction,
  state = "ready",
  selected = false,
  onClick,
}: PriceTickerProps) {
  return (
    <DoraCard
      as="article"
      className={cn(
        "min-w-[210px] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--line-strong)]",
        selected &&
          "border-[var(--teal-line)] shadow-[0_0_0_1px_var(--teal-line)]",
      )}
      contentClassName="p-4"
      emptyDescription="Add this commodity to a monitored source."
      emptyTitle="No quote available"
      errorDescription="The previous validated quote remains in history."
      errorTitle="Quote source delayed"
      state={state}
    >
      <button
        className="w-full text-left"
        disabled={!onClick}
        onClick={onClick}
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-extrabold text-[var(--teal)]">
              {symbol}
            </div>
            <div className="mt-0.5 text-xs font-semibold text-[var(--ink-muted)]">
              {name}
            </div>
          </div>
          <FreshnessIndicator label="Live" status="fresh" />
        </div>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <AnimatedNumber
              className="font-serif text-2xl font-medium text-[var(--ink)]"
              format={(value) =>
                `$${value.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
              }
              value={price}
            />
            <div className="mt-1 text-[10px] text-[var(--ink-muted)]">
              {currency} / {unit}
            </div>
          </div>
          <TrendIndicator direction={direction} value={change} />
        </div>
      </button>
    </DoraCard>
  );
}
