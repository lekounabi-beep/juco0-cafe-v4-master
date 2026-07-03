import type { Page } from "@playwright/test";

/**
 * Mock only the Viva payment provider redirect.
 * Application server actions and Supabase remain untouched.
 */
export async function mockVivaCheckoutRedirect(
  page: Page,
  returnBaseUrl: string,
  options?: { transactionId?: string },
): Promise<void> {
  const transactionId = options?.transactionId ?? "e2e-mock-transaction";

  await page.route("**/*vivapayments.com/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const orderCode = requestUrl.searchParams.get("ref") ?? "e2e-mock-order-code";
    const returnUrl = `${returnBaseUrl}/order-success?s=${encodeURIComponent(orderCode)}&t=${encodeURIComponent(transactionId)}`;

    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${returnUrl}"></head><body>Redirecting…</body></html>`,
    });
  });
}
