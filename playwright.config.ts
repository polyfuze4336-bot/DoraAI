import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.DORA_E2E_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.DORA_E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start --workspace @dora/web -- --port 3100",
        env: {
          AUTH_PROVIDER: "entra",
          DORA_ALLOW_LOCAL_STATE: "true",
        },
        url: "http://127.0.0.1:3100/api/health",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
