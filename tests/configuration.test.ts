import { describe, expect, it } from "vitest";

import { loadSharedConfig } from "@dora/shared";

describe("environment configuration", () => {
  it("applies safe local defaults", () => {
    expect(loadSharedConfig({})).toEqual({
      DORA_ENV: "development",
      LOG_LEVEL: "info",
      NEXT_PUBLIC_DORA_APP_NAME: "DORA",
      NEXT_PUBLIC_DORA_DEMO_MODE: true,
    });
  });

  it("parses explicit environment values", () => {
    expect(
      loadSharedConfig({
        DORA_ENV: "production",
        LOG_LEVEL: "warn",
        NEXT_PUBLIC_DORA_APP_NAME: "DORA Intelligence",
        NEXT_PUBLIC_DORA_DEMO_MODE: "false",
      }),
    ).toEqual({
      DORA_ENV: "production",
      LOG_LEVEL: "warn",
      NEXT_PUBLIC_DORA_APP_NAME: "DORA Intelligence",
      NEXT_PUBLIC_DORA_DEMO_MODE: false,
    });
  });
});
