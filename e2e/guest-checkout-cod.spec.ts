import { test, expect } from "@playwright/test";
import { attachConsoleGuard, assertNoRuntimeErrors } from "./helpers/console";
import { addFirstMenuItem, seedCart } from "./helpers/cart";
import { completeGuestPickupCodCheckout } from "./helpers/checkout";
import { isLiveE2E } from "./helpers/env";

test.describe("Guest checkout — Cash on Delivery", () => {
  test("guest can walk through pickup COD checkout UI", async ({ page }) => {
    const errors = attachConsoleGuard(page);

    await addFirstMenuItem(page);
    await page.goto("/checkout");

    await page.getByRole("button", { name: "Παραλαβή" }).click();
    await page.getByPlaceholder("69XXXXXXXX ή 27210XXXXX").fill("6912345678");
    await page.getByPlaceholder("Π.χ. Γιώργος Παπαδόπουλος").fill("E2E Guest");
    await page.getByRole("button", { name: /Μετρητά|Πληρωμή στο κατάστημα/ }).click();

    const submit = page.getByRole("button", { name: /Υποβολή παραγγελίας/ });
    await expect(submit).toBeEnabled();

    assertNoRuntimeErrors(errors);
  });

  test("@live guest completes pickup COD order and lands on tracking", async ({ page }) => {
    test.skip(!isLiveE2E(), "Set E2E_LIVE=1 with a dedicated Supabase test project and seeded products.");

    const errors = attachConsoleGuard(page);

    await seedCart(page, [
      { name: "Freddo Espresso", price: 2.5, qty: 1, category: "ΚΑΦΕΔΕΣ" },
    ]);
    await page.goto("/checkout");

    await completeGuestPickupCodCheckout(page, {
      name: "E2E Guest",
      phone: "6912345678",
    });

    await expect(page).toHaveURL(/\/track\/[0-9a-f-]{36}/i, { timeout: 30_000 });
    await expect(page.getByText("Παρακολούθηση Παραγγελίας")).toBeVisible();

    assertNoRuntimeErrors(errors);
  });
});
