"use client";

import { BookOpenText, Pause, Play, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { DoraCard } from "./dora-card";
import type { SurfaceState } from "./foundation";
import { ConfidenceIndicator, SourceBadge } from "./indicators";

interface ExecutiveBriefCardProps {
  readonly title: string;
  readonly brief: string;
  readonly generatedAt: string;
  readonly confidence: number;
  readonly sourceCount: number;
  readonly state?: SurfaceState;
  readonly defaultStreaming?: boolean;
  readonly onEvidence?: () => void;
  readonly className?: string;
}

export function ExecutiveBriefCard({
  title,
  brief,
  generatedAt,
  confidence,
  sourceCount,
  state = "ready",
  defaultStreaming = true,
  onEvidence,
  className,
}: ExecutiveBriefCardProps) {
  const words = brief.split(" ");
  const [streaming, setStreaming] = useState(defaultStreaming);
  const [visibleWords, setVisibleWords] = useState(
    defaultStreaming ? 7 : words.length,
  );

  useEffect(() => {
    if (!streaming || visibleWords >= words.length) {
      return;
    }

    const timer = window.setInterval(() => {
      setVisibleWords((current) => Math.min(current + 2, words.length));
    }, 80);

    return () => window.clearInterval(timer);
  }, [streaming, visibleWords, words.length]);

  const complete = visibleWords >= words.length;

  return (
    <DoraCard
      className={className}
      contentClassName="px-5 pb-5 sm:px-7 sm:pb-7"
      elevated
      emptyDescription="Generate a brief after the first validated intelligence cycle."
      emptyTitle="No executive brief yet"
      errorDescription="The evidence bundle is safe; DORA will resume from the last validated step."
      errorTitle="Brief generation interrupted"
      state={state}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--cyan)]">
          <Sparkles aria-hidden="true" size={14} /> DORA executive brief
        </div>
        <span className="text-[10px] font-semibold text-[var(--ink-muted)]">
          {generatedAt}
        </span>
      </div>
      <h2 className="mt-5 max-w-3xl font-serif text-3xl font-medium leading-[1.1] text-[var(--ink)]">
        {title}
      </h2>
      <p
        aria-live="polite"
        className="mt-5 max-w-3xl text-sm leading-7 text-[var(--ink-muted)]"
      >
        {words.slice(0, visibleWords).join(" ")}
        {!complete ? (
          <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-[var(--cyan)] align-middle" />
        ) : null}
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line-soft)] pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={`${sourceCount} sources`} />
          <ConfidenceIndicator value={confidence} />
        </div>
        <div className="flex items-center gap-2">
          {!complete ? (
            <button
              aria-label={
                streaming ? "Pause AI response" : "Resume AI response"
              }
              className="grid h-9 w-9 place-items-center rounded-[7px] border border-[var(--line)] text-[var(--ink-muted)] hover:bg-[var(--surface-subtle)]"
              onClick={() => setStreaming((current) => !current)}
              type="button"
            >
              {streaming ? (
                <Pause aria-hidden="true" size={14} />
              ) : (
                <Play aria-hidden="true" size={14} />
              )}
            </button>
          ) : null}
          {onEvidence ? (
            <button
              className="inline-flex h-9 items-center gap-2 rounded-[7px] bg-[var(--navy)] px-3 text-xs font-bold text-white hover:bg-[var(--navy-soft)]"
              onClick={onEvidence}
              type="button"
            >
              <BookOpenText aria-hidden="true" size={14} /> View evidence
            </button>
          ) : null}
        </div>
      </div>
    </DoraCard>
  );
}
