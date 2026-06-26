/**
 * Server-only Viva Wallet verification.
 * Never import this file from client components.
 */

export async function verifyVivaTransactionServer(transactionId: string): Promise<boolean> {
  const clientId = process.env.VIVA_CLIENT_ID;
  const clientSecret = process.env.VIVA_CLIENT_SECRET;
  const apiBaseUrl = process.env.VIVA_API_BASE_URL || "https://demo-api.vivapayments.com";
  const accountsBaseUrl =
    process.env.VIVA_ACCOUNTS_BASE_URL || "https://demo-accounts.vivapayments.com";

  if (!clientId || !clientSecret) {
    console.error("[Viva] Credentials missing — payment verification failed");
    return false;
  }

  if (!transactionId) return false;

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenResponse = await fetch(`${accountsBaseUrl}/connect/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[Viva] Verification token HTTP error:", tokenResponse.status, errorText);
      return false;
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("[Viva] Verification token missing in response");
      return false;
    }

    const response = await fetch(`${apiBaseUrl}/checkout/v2/transactions/${transactionId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Viva] Verification HTTP error:", response.status, errorText);
      return false;
    }

    const data = await response.json();
    const statusId = data.statusId ?? data.StatusId;
    const status = data.status ?? data.Status;

    return statusId === "F" || status === "Completed";
  } catch (error) {
    console.error("[Viva] Verification error:", error);
    return false;
  }
}
