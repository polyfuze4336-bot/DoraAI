import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "./utils";

export type SurfaceState = "ready" | "loading" | "empty" | "error";

interface StateBoundaryProps {
  readonly children: ReactNode;
  readonly state?: SurfaceState;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly errorTitle?: string;
  readonly errorDescription?: string;
  readonly loadingRows?: number;
  readonly className?: string;
}

export function StateBoundary({
  children,
  state = "ready",
  emptyTitle = "Nothing to show yet",
  emptyDescription = "Data will appear here when it becomes available.",
  errorTitle = "This view is temporarily unavailable",
  errorDescription = "The last validated information remains available elsewhere in DORA.",
  loadingRows = 3,
  className,
}: StateBoundaryProps) {
  if (state === "ready") {
    return children;
  }

  if (state === "loading") {
    return (
      <div
        aria-busy="true"
        aria-label="Loading"
        className={cn("space-y-3", className)}
      >
        {Array.from({ length: loadingRows }, (_, index) => (
          <div
            className="dora-skeleton h-4 rounded-full"
            key={index}
            style={{ width: `${Math.max(46, 94 - index * 13)}%` }}
          />
        ))}
      </div>
    );
  }

  const isEmpty = state === "empty";
  const isError = state === "error";
  const Icon = isError ? AlertTriangle : Inbox;

  return (
    <div
      className={cn(
        "flex min-h-32 flex-col items-center justify-center px-5 py-8 text-center",
        className,
      )}
      role={isEmpty ? "status" : "alert"}
    >
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full",
          isError
            ? "bg-[var(--danger-soft)] text-[var(--danger)]"
            : "bg-[var(--surface-subtle)] text-[var(--ink-muted)]",
        )}
      >
        <Icon aria-hidden="true" size={17} />
      </span>
      <p className="mt-3 text-sm font-semibold text-[var(--ink)]">
        {isError ? errorTitle : emptyTitle}
      </p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--ink-muted)]">
        {isError ? errorDescription : emptyDescription}
      </p>
    </div>
  );
}
