import type { Page } from "@playwright/test";

export async function completeGuestPickupCodCheckout(
  page: Page,
  contact: { name: string; phone: string },
): Promise<void> {
  await page.getByRole("button", { name: "Παραλαβή" }).click();
  await page.getByPlaceholder("69XXXXXXXX ή 27210XXXXX").fill(contact.phone);
  await page.getByPlaceholder("Π.χ. Γιώργος Παπαδόπουλος").fill(contact.name);
  await page.getByRole("button", { name: /Μετρητά|Πληρωμή στο κατάστημα/ }).click();
  await page.getByRole("button", { name: /Υποβολή παραγγελίας/ }).click();
}
