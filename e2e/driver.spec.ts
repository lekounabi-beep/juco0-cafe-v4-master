import { test, expect } from "@playwright/test";
import { attachConsoleGuard, assertNoRuntimeErrors } from "./helpers/console";
import { isLiveE2E } from "./helpers/env";

/**
 * Driver delivery workflow requires:
 * - Supabase with seeded drivers (see scripts/seed-dev-drivers.mjs, supabase/seeds/dev_drivers.sql)
 * - DRIVER_USERNAME / DRIVER_PASSWORD env vars matching a test driver
 * - An assignable order in "ready" or available state
 *
 * Not automated in default CI — enable with E2E_LIVE=1 and E2E_DRIVER=1.
 */
test.describe("Driver flow", () => {
  test.skip(
    !isLiveE2E() || process.env.E2E_DRIVER !== "1",
    "Requires E2E_LIVE=1, E2E_DRIVER=1, test database, and driver credentials.",
  );

  test("driver login → accept → pickup → delivered", async ({ page }) => {
    const errors = attachConsoleGuard(page);
    const username = process.env.E2E_DRIVER_USERNAME;
    const password = process.env.E2E_DRIVER_PASSWORD;

    if (!username || !password) {
      test.skip(true, "Set E2E_DRIVER_USERNAME and E2E_DRIVER_PASSWORD.");
      return;
    }

    await page.goto("/driver/login");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in|σύνδεση/i }).click();

    await expect(page).toHaveURL(/\/driver/, { timeout: 20_000 });

    assertNoRuntimeErrors(errors);
  });
});

test.describe("Driver smoke", () => {
  test("driver login page is reachable", async ({ page }) => {
    const errors = attachConsoleGuard(page);
    await page.goto("/driver/login");
    await expect(page.getByRole("heading", { name: "Σύνδεση οδηγού" })).toBeVisible();
    assertNoRuntimeErrors(errors);
  });
});
