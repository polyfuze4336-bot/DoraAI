import { expect, test } from "@playwright/test";

const expectedRoutes = [
  "/dashboard",
  "/risks",
  "/manufacturing",
  "/scenarios",
  "/knowledge",
  "/sources",
  "/reports",
  "/alerts",
  "/timeline",
  "/performance",
  "/settings",
];

test("navigation, commodity inspection, notifications and profile are actionable", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Markets remain moderately bullish/i }),
  ).toBeVisible();

  for (const route of expectedRoutes) {
    await expect(page.locator(`a[href^="${route}"]`).first()).toBeAttached();
  }
  await expect(
    page.locator('a[href="/?domain=market-intelligence"]'),
  ).toHaveCount(2);
  await expect(page.locator('a[href="/?domain=commodity-price"]')).toHaveCount(
    1,
  );
  await expect(page.locator('a[href="/?domain=news-updates"]')).toHaveCount(1);

  await page.getByRole("button", { name: "Inspect WTI crude" }).click();
  await expect(page.getByRole("dialog")).toContainText("WTI crude market view");
  await page.getByRole("button", { name: "Close evidence" }).click();

  const notificationButton = page.getByRole("button", {
    name: /notifications/i,
  });
  await notificationButton.click();
  await expect(page.getByText("Notifications", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close notifications" }).click();

  await page.getByRole("button", { name: "Open profile menu" }).click();
  await expect(page.getByText("Protected session")).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Account settings" }),
  ).toHaveAttribute("href", "/settings");
});

test("filters, charts, evidence, refresh and domain deep links change state", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Energy", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Inspect Copper" }),
  ).toHaveCount(0);
  const horizon = page.getByRole("button", { name: "30 days", exact: true });
  await horizon.click();
  await expect(horizon).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Refresh analysis" }).click();
  await page
    .getByRole("button", { name: "Evidence and reasoning", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Supporting Signals");

  await page.goto("/?domain=manufacturing-status");
  await expect(page.getByText("Manufacturing continuity")).toBeVisible();
  await page.getByRole("button", { name: /^Explain$/ }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Morning brief evidence",
  );
});

test("Ask DORA supports filters, date controls, streaming answer and citations", async ({
  page,
}) => {
  await page.goto("/dashboard?ask=1");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Why is Brent forecast to increase?" })
    .click();
  await page.getByLabel("From date").fill("2026-08-10");
  await page.getByLabel("To date").fill("2026-08-17");
  await page
    .getByRole("button", { name: "Ask DORA", exact: true })
    .last()
    .click();
  await expect(page.getByText("Observed Data", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/Citation|Sources/i).first()).toBeVisible();
});

test("scenario sliders call the engine and reset", async ({ page }) => {
  await page.goto("/scenarios");
  const slider = page.getByRole("slider", { name: "Shipping disruption" });
  await expect(slider).toHaveValue("35");
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/scenarios") &&
      response.request().method() === "POST",
  );
  await slider.fill("70");
  await responsePromise;
  await expect(slider).toHaveValue("70");
  await expect(page.getByText(/70%/).first()).toBeVisible();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(slider).toHaveValue("35");
});

test("operational workspaces expose real actions and external gates", async ({
  page,
  request,
}) => {
  await page.goto("/sources");
  await expect(
    page.getByRole("button", { name: "Test Connection" }).first(),
  ).toBeEnabled();
  const sourceResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/sources") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Test Connection" }).first().click();
  expect([200, 403]).toContain((await sourceResponse).status());
  await page
    .getByRole("button", { name: "Edit Configuration" })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Save non-secret configuration" }),
  ).toBeVisible();

  await page.goto("/alerts");
  await page.getByRole("button", { name: "all" }).click();
  await expect(page.locator("article").first()).toBeVisible();
  await page
    .getByText(/Evidence \(/)
    .first()
    .click();

  await page.goto("/risks");
  await expect(
    page.getByRole("heading", { name: "Risk intelligence" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Shipping route signal" }),
  ).toHaveAttribute("href", /^https:/);

  await page.goto("/reports");
  const downloadLink = page.getByRole("link", { name: "Download HTML" });
  await expect(downloadLink).toHaveAttribute(
    "href",
    /\/api\/reports\/.+\/download/,
  );
  const downloadHref = await downloadLink.getAttribute("href");
  const downloadResponse = await request.get(downloadHref!);
  expect(downloadResponse.ok()).toBeTruthy();
  expect(downloadResponse.headers()["content-disposition"]).toContain(
    "attachment",
  );
  const testEmailResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/reports") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send Test" }).click();
  const emailResponse = await testEmailResponse;
  expect([200, 403]).toContain(emailResponse.status());
  await expect(
    page
      .getByText(
        /awaiting.*configuration|configured|authorization is required/i,
      )
      .last(),
  ).toBeVisible();

  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  await page.goto("/settings");
  const save = page.getByRole("button", { name: "Save" });
  if (await save.count()) {
    await expect(save).toBeEnabled();
  } else {
    await expect(
      page.getByText(/administrator authorization is required/i),
    ).toBeVisible();
  }
});

test("every primary screen renders without client errors", async ({ page }) => {
  const screens = [
    ["/dashboard", /Markets remain moderately bullish/i],
    ["/?domain=commodity-price", /Markets are tightening/i],
    ["/knowledge", /Research/i],
    ["/sources", /Source management/i],
    ["/alerts", /DORA alerts/i],
    ["/risks", /Risk intelligence/i],
    ["/manufacturing", /^Manufacturing$/i],
    ["/scenarios", /Scenario analysis/i],
    ["/reports", /Management reports/i],
    ["/timeline", /Synchronized timeline/i],
    ["/performance", /Forecast performance/i],
  ] as const;
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  for (const [route, heading] of screens) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
  }
  expect(pageErrors).toEqual([]);
});

test("mobile critical pages do not overflow horizontally", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.includes("mobile"),
    "Mobile-only layout assertion",
  );
  for (const route of ["/dashboard", "/scenarios", "/reports", "/settings"]) {
    await page.goto(route);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(1);
  }
});
