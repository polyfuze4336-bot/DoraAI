"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/telemetry/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: error.name,
        message: error.message,
        digest: error.digest,
        path: location.pathname,
      }),
    });
  }, [error]);
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="font-serif text-3xl text-[var(--navy)]">
          DORA could not load this view.
        </h1>
        <p className="mt-3 text-sm text-[var(--ink-muted)]">
          The failure was recorded without sensitive page content.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-[8px] bg-[var(--navy)] px-4 py-2 text-sm font-bold text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
