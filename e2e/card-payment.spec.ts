import { test, expect } from "@playwright/test";
import { attachConsoleGuard, assertNoRuntimeErrors } from "./helpers/console";
import { seedCart } from "./helpers/cart";
import { completeGuestPickupCodCheckout } from "./helpers/checkout";
import { isLiveE2E } from "./helpers/env";
import { mockVivaCheckoutRedirect } from "./mocks/viva";

test.describe("Card payment flow", () => {
  test("Viva return params on /checkout forward to order-success", async ({ page }) => {
    const errors = attachConsoleGuard(page);

    await page.goto("/checkout?s=e2e-order-code&t=e2e-transaction-id");
    await expect(page).toHaveURL(/\/order-success\?.*s=e2e-order-code/);
    await expect(page.getByText(/Επιβεβαίωση πληρωμής|παραγγελία/i).first()).toBeVisible();

    assertNoRuntimeErrors(errors);
  });

  test("checkout shows card payment option", async ({ page }) => {
    const errors = attachConsoleGuard(page);

    await seedCart(page, [
      { name: "Freddo Espresso", price: 2.5, qty: 1, category: "ΚΑΦΕΔΕΣ" },
    ]);
    await page.goto("/checkout");

    await page.getByRole("button", { name: "Παραλαβή" }).click();
    await expect(
      page.getByRole("button", { name: /Κάρτα \/ Apple Pay \/ Google Pay/ }),
    ).toBeVisible();

    assertNoRuntimeErrors(errors);
  });

  test("@live card checkout mocks Viva redirect and reaches order-success", async ({ page }) => {
    test.skip(!isLiveE2E(), "Set E2E_LIVE=1 with Supabase test DB and valid Viva sandbox credentials.");

    const errors = attachConsoleGuard(page);
    const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:8080";

    await mockVivaCheckoutRedirect(page, baseURL);
    await seedCart(page, [
      { name: "Freddo Espresso", price: 2.5, qty: 1, category: "ΚΑΦΕΔΕΣ" },
    ]);
    await page.goto("/checkout");

    await page.getByRole("button", { name: "Παραλαβή" }).click();
    await page.getByPlaceholder("69XXXXXXXX ή 27210XXXXX").fill("6912345678");
    await page.getByPlaceholder("Π.χ. Γιώργος Παπαδόπουλος").fill("E2E Card Guest");
    await page.getByRole("button", { name: /Κάρτα \/ Apple Pay \/ Google Pay/ }).click();
    await page.getByRole("button", { name: /Πληρωμή & παραγγελία/ }).click();

    await expect(page).toHaveURL(/\/order-success/, { timeout: 45_000 });

    assertNoRuntimeErrors(errors);
  });
});
