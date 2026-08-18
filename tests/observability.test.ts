import { describe, expect, it } from "vitest";

import { correlationIdFromHeaders, redact } from "@dora/observability";

describe("observability security", () => {
  it("redacts credentials, tokens and report content recursively", () => {
    expect(
      redact({
        providerId: "eia",
        apiKey: "secret-value",
        nested: {
          authorization: "Bearer token",
          reportContent: "sensitive report",
          totalTokens: 42,
          count: 3,
        },
      }),
    ).toEqual({
      providerId: "eia",
      apiKey: "[REDACTED]",
      nested: {
        authorization: "[REDACTED]",
        reportContent: "[REDACTED]",
        totalTokens: 42,
        count: 3,
      },
    });
  });

  it("accepts valid correlation IDs and rejects unsafe values", () => {
    expect(
      correlationIdFromHeaders(
        new Headers({ "x-correlation-id": "dora-run-12345" }),
      ),
    ).toBe("dora-run-12345");
    expect(
      correlationIdFromHeaders(
        new Headers({ "x-correlation-id": "bad value with spaces" }),
      ),
    ).toMatch(/^[0-9a-f-]{36}$/);
  });
});
