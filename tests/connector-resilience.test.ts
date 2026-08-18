import { describe, expect, it, vi } from "vitest";

import { ProviderHttpError, ResilientHttpClient } from "@dora/connectors";

const policy = {
  timeoutMs: 1_000,
  retry: { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 500 },
  rateLimit: { requests: 100, perMilliseconds: 100 },
};

describe("connector resilience", () => {
  it("retries transient failures with exponential backoff", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const delays: number[] = [];
    const client = new ResilientHttpClient(
      "test-provider",
      policy,
      fetchImplementation,
      {
        now: () => 0,
        sleep: async (delay) => {
          delays.push(delay);
        },
      },
    );

    await expect(client.request("https://example.test/data")).resolves.toEqual(
      expect.objectContaining({ status: 200 }),
    );
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(delays).toContain(100);
  });

  it("does not retry non-transient client errors", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("bad request", { status: 400 }));
    const client = new ResilientHttpClient(
      "test-provider",
      policy,
      fetchImplementation,
    );

    await expect(client.request("https://example.test/data")).rejects.toEqual(
      expect.objectContaining<Partial<ProviderHttpError>>({
        status: 400,
        retryable: false,
      }),
    );
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it("honors Retry-After for throttled responses", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("throttled", {
          status: 429,
          headers: { "retry-after": "2" },
        }),
      )
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const delays: number[] = [];
    const client = new ResilientHttpClient(
      "test-provider",
      policy,
      fetchImplementation,
      {
        now: () => 0,
        sleep: async (delay) => {
          delays.push(delay);
        },
      },
    );

    await client.request("https://example.test/data");
    expect(delays).toContain(500);
  });

  it("aborts requests that exceed the configured timeout", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockImplementation(
      async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    );
    const client = new ResilientHttpClient(
      "timeout-provider",
      {
        ...policy,
        timeoutMs: 20,
        retry: { ...policy.retry, maxAttempts: 1 },
      },
      fetchImplementation,
    );

    await expect(client.request("https://example.test/slow")).rejects.toThrow(
      /timed out|timeout/i,
    );
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });
});
