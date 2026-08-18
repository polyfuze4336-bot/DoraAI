import type { ProviderRuntimePolicy } from "./contracts";
import { logStructured } from "@dora/observability";

const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

export class ProviderHttpError extends Error {
  constructor(
    readonly providerId: string,
    readonly status: number,
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = "ProviderHttpError";
  }
}

interface ResilienceDependencies {
  readonly now?: () => number;
  readonly sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
}

class IntervalRateLimiter {
  readonly #intervalMs: number;
  readonly #now: () => number;
  readonly #sleep: (delayMs: number, signal?: AbortSignal) => Promise<void>;
  #nextAvailableAt = 0;

  constructor(
    policy: ProviderRuntimePolicy["rateLimit"],
    dependencies: Required<ResilienceDependencies>,
  ) {
    this.#intervalMs = Math.ceil(policy.perMilliseconds / policy.requests);
    this.#now = dependencies.now;
    this.#sleep = dependencies.sleep;
  }

  async acquire(signal?: AbortSignal): Promise<void> {
    const now = this.#now();
    const waitMs = Math.max(0, this.#nextAvailableAt - now);
    this.#nextAvailableAt =
      Math.max(now, this.#nextAvailableAt) + this.#intervalMs;

    if (waitMs > 0) {
      await this.#sleep(waitMs, signal);
    }
  }
}

export class ResilientHttpClient {
  readonly #fetch: typeof fetch;
  readonly #limiter: IntervalRateLimiter;
  readonly #policy: ProviderRuntimePolicy;
  readonly #sleep: (delayMs: number, signal?: AbortSignal) => Promise<void>;

  constructor(
    readonly providerId: string,
    policy: ProviderRuntimePolicy,
    fetchImplementation: typeof fetch = fetch,
    dependencies: ResilienceDependencies = {},
  ) {
    const resolvedDependencies: Required<ResilienceDependencies> = {
      now: dependencies.now ?? Date.now,
      sleep: dependencies.sleep ?? abortableSleep,
    };

    this.#fetch = fetchImplementation;
    this.#policy = policy;
    this.#sleep = resolvedDependencies.sleep;
    this.#limiter = new IntervalRateLimiter(
      policy.rateLimit,
      resolvedDependencies,
    );
  }

  async request(
    input: URL | string,
    init: RequestInit = {},
  ): Promise<Response> {
    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= this.#policy.retry.maxAttempts;
      attempt += 1
    ) {
      await this.#limiter.acquire(init.signal ?? undefined);
      const timeoutSignal = AbortSignal.timeout(this.#policy.timeoutMs);
      const signal = init.signal
        ? AbortSignal.any([init.signal, timeoutSignal])
        : timeoutSignal;

      try {
        const response = await this.#fetch(input, { ...init, signal });
        if (response.ok) {
          return response;
        }

        const retryable = retryableStatuses.has(response.status);
        const error = new ProviderHttpError(
          this.providerId,
          response.status,
          retryable,
          `${this.providerId} request failed: HTTP ${response.status}`,
        );

        if (!retryable || attempt === this.#policy.retry.maxAttempts) {
          this.logFailure(error, attempt);
          throw error;
        }

        lastError = error;
        await this.#sleep(
          this.retryDelay(attempt, response),
          init.signal ?? undefined,
        );
      } catch (error) {
        if (error instanceof ProviderHttpError && !error.retryable) {
          this.logFailure(error, attempt);
          throw error;
        }

        if (
          init.signal?.aborted ||
          attempt === this.#policy.retry.maxAttempts
        ) {
          const normalized = normalizeProviderError(this.providerId, error);
          this.logFailure(normalized, attempt);
          throw normalized;
        }

        lastError = error;
        await this.#sleep(this.retryDelay(attempt), init.signal ?? undefined);
      }
    }

    throw normalizeProviderError(this.providerId, lastError);
  }

  private retryDelay(attempt: number, response?: Response): number {
    const retryAfter = response?.headers.get("retry-after");
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds)) {
        return Math.min(seconds * 1_000, this.#policy.retry.maxDelayMs);
      }
    }

    return Math.min(
      this.#policy.retry.baseDelayMs * 2 ** (attempt - 1),
      this.#policy.retry.maxDelayMs,
    );
  }

  private logFailure(error: Error, attempt: number): void {
    logStructured({
      event: "connector.error",
      correlationId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      success: false,
      attributes: { providerId: this.providerId, attempt },
      error: { type: error.name, message: error.message },
    });
  }
}

export const defaultProviderRuntimePolicy: ProviderRuntimePolicy = {
  timeoutMs: 10_000,
  retry: {
    maxAttempts: 3,
    baseDelayMs: 500,
    maxDelayMs: 8_000,
  },
  rateLimit: {
    requests: 1,
    perMilliseconds: 1_000,
  },
};

export function redactUrl(input: URL | string): string {
  const url = new URL(String(input));
  for (const key of ["api_key", "apikey", "token", "access_token"]) {
    if (url.searchParams.has(key)) {
      url.searchParams.set(key, "REDACTED");
    }
  }
  return url.toString();
}

async function abortableSleep(
  delayMs: number,
  signal?: AbortSignal,
): Promise<void> {
  if (delayMs <= 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, delayMs);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new Error("Operation aborted."));
      },
      { once: true },
    );
  });
}

function normalizeProviderError(providerId: string, error: unknown): Error {
  if (error instanceof Error) {
    const cause =
      error.cause instanceof Error ? ` (${error.cause.message})` : "";
    return new Error(`${providerId}: ${error.message}${cause}`, {
      cause: error,
    });
  }

  return new Error(`${providerId}: unknown provider request failure.`);
}
