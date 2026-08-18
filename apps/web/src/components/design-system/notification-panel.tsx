"use client";

import * as Popover from "@radix-ui/react-popover";
import {
  Bell,
  Check,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";

import { StateBoundary, type SurfaceState } from "./foundation";
import { RiskBadge, type RiskLevel } from "./indicators";

export interface DoraNotification {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly time: string;
  readonly risk: RiskLevel;
  readonly read?: boolean;
}

interface NotificationPanelProps {
  readonly notifications: readonly DoraNotification[];
  readonly state?: SurfaceState;
}

export function NotificationPanel({
  notifications,
  state = "ready",
}: NotificationPanelProps) {
  const [readIds, setReadIds] = useState<readonly string[]>(
    notifications.filter((item) => item.read).map((item) => item.id),
  );
  const unreadCount = notifications.filter(
    (item) => !readIds.includes(item.id),
  ).length;
  const effectiveState =
    state === "ready" && notifications.length === 0 ? "empty" : state;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label={`${unreadCount} notifications`}
          className="relative grid h-10 w-10 place-items-center rounded-[8px] border border-white/65 bg-white/65 text-[var(--ink-muted)] shadow-[var(--shadow-control)] backdrop-blur-lg transition-colors hover:bg-white hover:text-[var(--ink)]"
          type="button"
        >
          <Bell aria-hidden="true" size={17} />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--danger)] ring-2 ring-white" />
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-50 mt-2 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-[12px] border border-white/70 bg-[rgba(252,253,250,.96)] shadow-[var(--shadow-float)] backdrop-blur-xl data-[state=closed]:animate-[fade-out_.15s_ease] data-[state=open]:animate-[fade-in_.18s_ease]"
          sideOffset={6}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
                <Sparkles
                  aria-hidden="true"
                  className="text-[var(--teal)]"
                  size={15}
                />{" "}
                Notifications
              </div>
              <p className="mt-1 text-[10px] text-[var(--ink-muted)]">
                Only material changes and requested briefs
              </p>
            </div>
            <Popover.Close asChild>
              <button
                aria-label="Close notifications"
                className="grid h-7 w-7 place-items-center rounded-[6px] text-[var(--ink-muted)] hover:bg-[var(--surface-subtle)]"
                type="button"
              >
                <X aria-hidden="true" size={14} />
              </button>
            </Popover.Close>
          </div>

          <StateBoundary
            className="m-4"
            emptyDescription="Material changes will appear here."
            emptyTitle="You are up to date"
            errorDescription="Notification delivery is delayed; dashboard signals remain current."
            errorTitle="Notifications unavailable"
            loadingRows={4}
            state={effectiveState}
          >
            <div className="max-h-[430px] divide-y divide-[var(--line-soft)] overflow-y-auto">
              {notifications.map((item) => {
                const read = readIds.includes(item.id);
                return (
                  <button
                    className="grid w-full grid-cols-[28px_1fr_auto] gap-3 px-4 py-4 text-left transition-colors hover:bg-[var(--surface-subtle)]"
                    key={item.id}
                    onClick={() =>
                      setReadIds((current) => [
                        ...new Set([...current, item.id]),
                      ])
                    }
                    type="button"
                  >
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-[7px] ${read ? "bg-[var(--surface-subtle)] text-[var(--ink-muted)]" : "bg-[var(--navy)] text-white"}`}
                    >
                      {read ? (
                        <Check aria-hidden="true" size={13} />
                      ) : (
                        <ShieldAlert aria-hidden="true" size={13} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[var(--ink)]">
                          {item.title}
                        </span>
                        <RiskBadge level={item.risk} />
                      </span>
                      <span className="mt-1 block text-[10px] leading-4 text-[var(--ink-muted)]">
                        {item.detail}
                      </span>
                      <span className="mt-2 block text-[10px] font-semibold text-[var(--ink-muted)]">
                        {item.time}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="mt-1 text-[var(--ink-muted)]"
                      size={14}
                    />
                  </button>
                );
              })}
            </div>
          </StateBoundary>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
