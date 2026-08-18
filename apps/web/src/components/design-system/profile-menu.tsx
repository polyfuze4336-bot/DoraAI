"use client";

import { ChevronDown, LogOut, Settings, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function ProfileMenu() {
  const [open, setOpen] = useState(false);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-label="Open profile menu"
        className="flex h-10 items-center gap-2 rounded-[8px] border border-white/65 bg-white/65 px-2 text-[var(--ink)] shadow-[var(--shadow-control)] backdrop-blur-lg transition-colors hover:bg-white"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--cyan-soft)] text-[9px] font-extrabold text-[var(--navy)]">
          MK
        </span>
        <ChevronDown aria-hidden="true" size={13} />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-[10px] border border-white/70 bg-[rgba(252,253,250,.97)] shadow-[var(--shadow-float)] backdrop-blur-xl"
          role="menu"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] p-4">
            <div>
              <div className="text-sm font-bold text-[var(--ink)]">
                Maya Khan
              </div>
              <div className="mt-1 text-[10px] text-[var(--ink-muted)]">
                Executive sponsor
              </div>
            </div>
            <button
              aria-label="Close profile menu"
              className="grid h-7 w-7 place-items-center rounded-[6px] text-[var(--ink-muted)] hover:bg-[var(--surface-subtle)]"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>
          <div className="p-2">
            <Link
              className="flex h-10 items-center gap-3 rounded-[7px] px-3 text-xs font-bold text-[var(--ink)] hover:bg-[var(--surface-subtle)]"
              href="/settings"
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              <Settings aria-hidden="true" size={15} /> Account settings
            </Link>
            <div className="flex items-center gap-3 px-3 py-2 text-[10px] text-[var(--ink-muted)]">
              <ShieldCheck aria-hidden="true" size={15} /> Protected session
            </div>
            <button
              className="flex h-10 w-full items-center gap-3 rounded-[7px] px-3 text-left text-xs font-bold text-[var(--ink)] hover:bg-[var(--surface-subtle)]"
              onClick={signOut}
              role="menuitem"
              type="button"
            >
              <LogOut aria-hidden="true" size={15} /> Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
