import type { Page } from "@playwright/test";

export type SeedCartItem = {
  name: string;
  price: number;
  qty: number;
  category?: string;
};

export async function seedCart(page: Page, items: SeedCartItem[]): Promise<void> {
  await page.goto("/");
  await page.evaluate((cartItems) => {
    const payload = {
      state: { items: cartItems },
      version: 0,
    };
    localStorage.setItem("juco-cart", JSON.stringify(payload));
  }, items);
  await page.reload();
  await page.waitForLoadState("networkidle");
}

export async function addFirstMenuItem(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const addButton = page.getByRole("button", { name: "Προσθήκη" }).first();
  await addButton.waitFor({ state: "visible" });
  await addButton.click();
}
