/**
 * Server-only Viva Wallet verification with amount/currency checks.
 */

import { requireVivaCredentials, isProduction } from "@/lib/server/env";
import { serverLog } from "@/lib/server/logger";

export type VivaTransactionDetails = {
  verified: boolean;
  amountCents: number;
  currencyCode: string;
  orderCode: string | null;
  merchantTrns: string | null;
  statusId: string | null;
};

const EUR_CURRENCY_NUMERIC = "978";

async function fetchVivaAccessToken(): Promise<string | null> {
  const { clientId, clientSecret } = requireVivaCredentials();
  const accountsBaseUrl =
    process.env.VIVA_ACCOUNTS_BASE_URL || "https://demo-accounts.vivapayments.com";

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
    serverLog.error("payment.failed", { step: "token", status: tokenResponse.status, errorText });
    return null;
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token ?? null;
}

export async function fetchVivaTransactionDetails(
  transactionId: string,
): Promise<VivaTransactionDetails | null> {
  if (!transactionId) return null;

  if (isProduction()) {
    requireVivaCredentials();
  }

  const apiBaseUrl = process.env.VIVA_API_BASE_URL || "https://demo-api.vivapayments.com";

  try {
    const accessToken = await fetchVivaAccessToken();
    if (!accessToken) return null;

    const response = await fetch(`${apiBaseUrl}/checkout/v2/transactions/${transactionId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      serverLog.error("payment.failed", {
        step: "transaction_fetch",
        transactionId,
        status: response.status,
        errorText,
      });
      return null;
    }

    const data = await response.json();
    const statusId = String(data.statusId ?? data.StatusId ?? "");
    const status = data.status ?? data.Status;
    const verified = statusId === "F" || status === "Completed";

    const amountRaw = data.amount ?? data.Amount ?? 0;
    const amountCents = typeof amountRaw === "number" ? amountRaw : Number(amountRaw);
    const currencyCode = String(data.currencyCode ?? data.CurrencyCode ?? EUR_CURRENCY_NUMERIC);
    const orderCode = data.orderCode ?? data.OrderCode ?? null;
    const merchantTrns = data.merchantTrns ?? data.MerchantTrns ?? null;

    return {
      verified,
      amountCents,
      currencyCode,
      orderCode: orderCode != null ? String(orderCode) : null,
      merchantTrns: merchantTrns != null ? String(merchantTrns) : null,
      statusId: statusId || null,
    };
  } catch (error) {
    serverLog.error("payment.failed", {
      step: "transaction_fetch_exception",
      transactionId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export async function verifyVivaTransactionServer(transactionId: string): Promise<boolean> {
  const details = await fetchVivaTransactionDetails(transactionId);
  return details?.verified === true;
}

export function assertVivaPaymentMatchesOrder(
  details: VivaTransactionDetails,
  expectedTotalEur: number,
  expectedOrderCode?: string | null,
): { ok: true } | { ok: false; reason: string } {
  if (!details.verified) {
    return { ok: false, reason: "payment_not_completed" };
  }

  const expectedCents = Math.round(expectedTotalEur * 100);
  if (details.amountCents !== expectedCents) {
    serverLog.error("payment.amount_mismatch", {
      expectedCents,
      actualCents: details.amountCents,
      orderCode: details.orderCode,
    });
    return { ok: false, reason: "amount_mismatch" };
  }

  if (details.currencyCode !== EUR_CURRENCY_NUMERIC) {
    serverLog.error("payment.failed", {
      reason: "currency_mismatch",
      currency: details.currencyCode,
    });
    return { ok: false, reason: "currency_mismatch" };
  }

  if (expectedOrderCode) {
    if (!details.orderCode) {
      serverLog.error("payment.failed", {
        reason: "order_code_missing",
        expectedOrderCode,
      });
      return { ok: false, reason: "order_code_missing" };
    }
    if (details.orderCode !== expectedOrderCode) {
      serverLog.error("payment.failed", {
        reason: "order_code_mismatch",
        expectedOrderCode,
        actualOrderCode: details.orderCode,
      });
      return { ok: false, reason: "order_code_mismatch" };
    }
  }

  return { ok: true };
}

export async function createVivaPaymentOrderServer(
  amountEur: number,
  redirectUrl: string,
): Promise<{ orderCode: string } | { error: string }> {
  const { clientId, clientSecret, sourceCode } = requireVivaCredentials();
  const apiBaseUrl = process.env.VIVA_API_BASE_URL || "https://demo-api.vivapayments.com";

  const accessToken = await fetchVivaAccessToken();
  if (!accessToken) {
    return { error: "Failed to obtain Viva access token" };
  }

  const orderBody = {
    amount: Math.round(amountEur * 100),
    customerTrns: `Order-${Date.now()}`,
    merchantTrns: `Juco-${Date.now()}`,
    sourceCode,
    currencyCode: EUR_CURRENCY_NUMERIC,
    paymentTimeout: 900,
    maxInstallments: 0,
    allowRecurring: false,
    isPreAuth: false,
    disableExactAmount: false,
    disableCash: true,
    disableWallet: false,
    tipAmount: 0,
    disableVivaWallet: false,
    redirectUrl,
  };

  const orderResponse = await fetch(`${apiBaseUrl}/checkout/v2/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(orderBody),
  });

  if (!orderResponse.ok) {
    const errorText = await orderResponse.text();
    serverLog.error("payment.failed", { step: "create_order", status: orderResponse.status, errorText });
    return { error: "Failed to create Viva payment order" };
  }

  const orderData = await orderResponse.json();
  const orderCode = orderData.orderCode || orderData.OrderCode;

  if (!orderCode) {
    return { error: "No order code received from Viva" };
  }

  serverLog.info("payment.initiated", { orderCode, amountEur });

  return { orderCode: String(orderCode) };
}
