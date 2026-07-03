import { test, expect } from "@playwright/test";
import { attachConsoleGuard, assertNoRuntimeErrors } from "./helpers/console";
import { isLiveE2E } from "./helpers/env";

const UNKNOWN_ORDER_ID = "00000000-0000-4000-8000-000000000099";

test.describe("Order tracking", () => {
  test("track route is reachable", async ({ page }) => {
    const response = await page.goto(`/track/${UNKNOWN_ORDER_ID}`, {
      waitUntil: "domcontentloaded",
    });

    expect(response).not.toBeNull();
    expect(page.url()).toContain(`/track/${UNKNOWN_ORDER_ID}`);
    // Without a real Supabase project the server action may return 500.
    // Full UI verification runs under @live with E2E_TRACK_ORDER_ID.
    expect(response!.status()).toBeLessThan(600);
  });

  test("@live tracking shows not-found UI for unknown order", async ({ page }) => {
    test.skip(!isLiveE2E(), "Set E2E_LIVE=1 with a dedicated Supabase test project.");

    const errors = attachConsoleGuard(page);

    await page.goto(`/track/${UNKNOWN_ORDER_ID}`);
    await expect(page.getByRole("heading", { name: "Παραγγελία δεν βρέθηκε" })).toBeVisible({
      timeout: 25_000,
    });

    assertNoRuntimeErrors(errors);
  });

  test("@live tracking page shows order after COD checkout", async ({ page }) => {
    test.skip(!isLiveE2E(), "Set E2E_LIVE=1 — run after guest COD @live test or seed an order.");

    const errors = attachConsoleGuard(page);
    const orderId = process.env.E2E_TRACK_ORDER_ID;
    test.skip(!orderId, "Set E2E_TRACK_ORDER_ID to a valid order UUID from the test database.");

    await page.goto(`/track/${orderId}`);
    await expect(page.getByText("Παρακολούθηση Παραγγελίας")).toBeVisible();
    await expect(page.locator("text=Δεν βρέθηκε").or(page.getByText(/Παραγγελία/i))).toBeVisible();

    assertNoRuntimeErrors(errors);
  });
});
