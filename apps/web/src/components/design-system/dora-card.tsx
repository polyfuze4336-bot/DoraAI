import type { ElementType, ReactNode } from "react";

import { StateBoundary, type SurfaceState } from "./foundation";
import { cn } from "./utils";

export interface DoraCardProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly footer?: ReactNode;
  readonly state?: SurfaceState;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly errorTitle?: string;
  readonly errorDescription?: string;
  readonly as?: ElementType;
  readonly elevated?: boolean;
}

export function DoraCard({
  children,
  className,
  contentClassName,
  eyebrow,
  title,
  description,
  action,
  footer,
  state = "ready",
  emptyTitle,
  emptyDescription,
  errorTitle,
  errorDescription,
  as: Component = "section",
  elevated = false,
}: DoraCardProps) {
  const hasHeader = eyebrow || title || description || action;

  return (
    <Component
      className={cn(
        "dora-card overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--surface)]",
        elevated && "dora-card-elevated",
        className,
      )}
    >
      {hasHeader ? (
        <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="mb-1.5 text-[10px] font-bold uppercase text-[var(--brand)]">
                {eyebrow}
              </div>
            ) : null}
            {title ? (
              <h2 className="text-sm font-bold text-[var(--ink)]">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}

      <StateBoundary
        emptyDescription={emptyDescription}
        emptyTitle={emptyTitle}
        errorDescription={errorDescription}
        errorTitle={errorTitle}
        state={state}
      >
        <div className={cn(hasHeader && "pt-1", contentClassName)}>
          {children}
        </div>
      </StateBoundary>

      {footer && state === "ready" ? (
        <footer className="border-t border-[var(--line-soft)] px-5 py-3 sm:px-6">
          {footer}
        </footer>
      ) : null}
    </Component>
  );
}
