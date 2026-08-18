import { expect, test } from "@playwright/test";

const username = process.env.DORA_E2E_USERNAME;
const password = process.env.DORA_E2E_PASSWORD;

test("database login protects routes and logout clears the session", async ({
  page,
}) => {
  test.skip(!username || !password, "Deployment credentials are required.");

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  await page.getByLabel("Email").fill(username!);
  await page.getByLabel("Password").fill(`${password!}-invalid`);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(
    page.getByText("The email or password is incorrect.", { exact: true }),
  ).toBeVisible();

  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: /Markets remain moderately bullish/i }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");

  const session = (await page.context().cookies()).find(
    (cookie) => cookie.name === "dora_session",
  );
  expect(session?.httpOnly).toBe(true);
  expect(session?.secure).toBe(true);
  expect(session?.sameSite).toBe("Lax");

  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "DORA settings" }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?returnTo=/);
});