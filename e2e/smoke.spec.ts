import { test, expect } from "@playwright/test";
import { attachConsoleGuard, assertNoRuntimeErrors } from "./helpers/console";
import { seedCart } from "./helpers/cart";

test.describe("Smoke", () => {
  test("home page loads menu", async ({ page }) => {
    const errors = attachConsoleGuard(page);
    await page.goto("/");
    await expect(page.getByText("Juco").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Προσθήκη" }).first()).toBeVisible();
    assertNoRuntimeErrors(errors);
  });

  test("checkout page loads with cart items", async ({ page }) => {
    const errors = attachConsoleGuard(page);
    await seedCart(page, [
      { name: "Freddo Espresso", price: 2.5, qty: 1, category: "ΚΑΦΕΔΕΣ" },
    ]);
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Ολοκλήρωση Παραγγελίας" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Υποβολή παραγγελίας|Πληρωμή & παραγγελία/ })).toBeVisible();
    assertNoRuntimeErrors(errors);
  });
});
