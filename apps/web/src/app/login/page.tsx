"use client";

import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Sign in failed.");
        return;
      }
      const requested = new URLSearchParams(window.location.search).get("returnTo");
      window.location.assign(requested?.startsWith("/") ? requested : "/dashboard");
    } catch {
      setError("DORA could not complete sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="fixed inset-0 z-[100] grid min-h-screen place-items-center overflow-y-auto bg-[var(--canvas)] px-5 py-10">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.88),transparent_48%),linear-gradient(rgba(13,38,56,.022)_1px,transparent_1px),linear-gradient(90deg,rgba(13,38,56,.022)_1px,transparent_1px)] bg-[size:auto,32px_32px,32px_32px]" />
      <section className="relative w-full max-w-[420px] overflow-hidden rounded-[12px] border border-white/80 bg-[rgba(252,253,250,.94)] shadow-[0_28px_80px_rgba(13,38,56,.14)] backdrop-blur-xl">
        <div className="border-b border-[var(--line)] px-7 pb-6 pt-7 sm:px-9 sm:pt-9">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[10px] bg-[var(--navy)] font-serif text-2xl text-white">D</div>
            <div>
              <div className="text-sm font-extrabold text-[var(--navy)]">DORA</div>
              <div className="text-[10px] text-[var(--ink-muted)]">Commodity Intelligence</div>
            </div>
          </div>
          <h1 className="mt-8 font-serif text-[34px] font-medium leading-none text-[var(--navy)]">Welcome back</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">Sign in to open the executive command centre.</p>
        </div>
        <form className="px-7 py-7 sm:px-9 sm:py-8" onSubmit={signIn}>
          <label className="block text-[10px] font-bold uppercase text-[var(--ink-muted)]">
            Email
            <input
              autoComplete="username"
              autoFocus
              className="mt-2 h-11 w-full rounded-[8px] border border-[var(--line)] bg-white px-3 text-sm normal-case text-[var(--ink)] outline-none focus:border-[var(--teal)]"
              onChange={(event) => setUsername(event.target.value)}
              required
              type="email"
              value={username}
            />
          </label>
          <label className="mt-5 block text-[10px] font-bold uppercase text-[var(--ink-muted)]">
            Password
            <div className="relative mt-2">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]" size={15} />
              <input
                autoComplete="current-password"
                className="h-11 w-full rounded-[8px] border border-[var(--line)] bg-white pl-10 pr-3 text-sm normal-case text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
          </label>
          {error ? (
            <div className="mt-5 rounded-[8px] border border-[var(--danger-line)] bg-[var(--danger-soft)] p-3 text-xs text-[var(--danger)]" role="alert">{error}</div>
          ) : null}
          <button
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--navy)] text-sm font-bold text-white transition-colors hover:bg-[var(--navy-soft)] disabled:cursor-wait disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            {busy ? <LoaderCircle className="animate-spin" size={16} /> : <>Sign In <ArrowRight size={15} /></>}
          </button>
        </form>
      </section>
    </main>
  );
}