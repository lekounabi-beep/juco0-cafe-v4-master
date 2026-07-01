/**
 * Shared Viva order completion — used by server action, webhook, and order-success UX.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  fetchVivaTransactionDetails,
  assertVivaPaymentMatchesOrder,
} from "@/integrations/viva/services/payment.server";
import {
  verifyCheckoutToken,
  type CheckoutTokenPayload,
} from "@/lib/server/checkout-token.server";
import { setOrderAccessCookie } from "@/lib/server/order-access.server";
import { serverLog } from "@/lib/server/logger";
import type { TablesInsert } from "@/integrations/supabase/types";

export type CompleteVivaOrderResult = { id: string; order_number: string };

export type CompleteVivaOrderOptions = {
  /** Set order_access cookie — false for webhook (no browser context). */
  setAccessCookie?: boolean;
  /** Remove checkout_pending row after success. */
  clearPending?: boolean;
};

/** Read-only lookup — safe for browser polling (webhook may have created the order). */
export async function findOrderByTransactionId(
  transactionId: string,
): Promise<CompleteVivaOrderResult | null> {
  if (!transactionId) return null;

  const { data } = await supabaseAdmin
    .from("orders")
    .select("id, order_number")
    .eq("viva_transaction_id", transactionId)
    .maybeSingle();

  if (!data) return null;
  return data as CompleteVivaOrderResult;
}

async function findExistingOrder(
  transactionId: string,
  clientRequestId: string,
): Promise<CompleteVivaOrderResult | null> {
  const existingByTxn = await findOrderByTransactionId(transactionId);
  if (existingByTxn) return existingByTxn;

  const { data: existingByIdempotency } = await supabaseAdmin
    .from("orders")
    .select("id, order_number")
    .eq("client_request_id", clientRequestId)
    .maybeSingle();

  if (existingByIdempotency) {
    return existingByIdempotency as CompleteVivaOrderResult;
  }

  return null;
}

async function clearCheckoutPending(vivaOrderCode: string | null | undefined): Promise<void> {
  if (!vivaOrderCode) return;
  await supabaseAdmin
    .from("checkout_pending" as never)
    .delete()
    .eq("viva_order_code", vivaOrderCode);
}

export async function completePaidVivaOrder(
  checkoutToken: string,
  transactionId: string,
  options: CompleteVivaOrderOptions = {},
): Promise<CompleteVivaOrderResult> {
  const { setAccessCookie = true, clearPending = true } = options;

  if (!transactionId) {
    throw new Error("Missing transaction ID");
  }

  if (!checkoutToken) {
    throw new Error("Missing checkout token");
  }

  const draft = verifyCheckoutToken(checkoutToken);
  if (!draft) {
    serverLog.error("order.rejected", { reason: "invalid_checkout_token", transactionId });
    throw new Error("Η πληρωμή δεν επαληθεύτηκε. Επικοινωνήστε μαζί μας.");
  }

  const existing = await findExistingOrder(transactionId, draft.clientRequestId);
  if (existing) {
    if (setAccessCookie) {
      await setOrderAccessCookie(existing.id);
    }
    if (clearPending) {
      await clearCheckoutPending(draft.vivaOrderCode);
    }
    return existing;
  }

  const txn = await fetchVivaTransactionDetails(transactionId);
  if (!txn) {
    serverLog.error("payment.failed", { transactionId, reason: "fetch_failed" });
    throw new Error("Η πληρωμή δεν επαληθεύτηκε. Επικοινωνήστε μαζί μας.");
  }

  const match = assertVivaPaymentMatchesOrder(txn, draft.total, draft.vivaOrderCode ?? null);
  if (!match.ok) {
    serverLog.error("order.rejected", {
      reason: match.reason,
      transactionId,
      expectedTotal: draft.total,
      actualCents: txn.amountCents,
    });
    throw new Error("Η πληρωμή δεν επαληθεύτηκε. Επικοινωνήστε μαζί μας.");
  }

  serverLog.info("payment.verified", {
    transactionId,
    amountCents: txn.amountCents,
    clientRequestId: draft.clientRequestId,
  });

  const orderPayload: TablesInsert<"orders"> = {
    items: draft.items as never,
    subtotal: draft.subtotal,
    delivery_fee: draft.delivery_fee,
    total: draft.total,
    customer_name: draft.customer_name,
    customer_phone: draft.customer_phone,
    address: draft.address,
    address_notes: draft.address_notes,
    lat: draft.lat,
    lng: draft.lng,
    payment_method: "card",
    payment_status: "paid",
    notes: draft.notes,
    status: "pending",
    viva_transaction_id: transactionId,
    user_id: draft.user_id,
    client_request_id: draft.clientRequestId,
  } as TablesInsert<"orders">;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert(orderPayload as never)
    .select("id, order_number")
    .single();

  if (error) {
    if (error.code === "23505") {
      const dup = await findExistingOrder(transactionId, draft.clientRequestId);
      if (dup) {
        if (setAccessCookie) {
          await setOrderAccessCookie(dup.id);
        }
        if (clearPending) {
          await clearCheckoutPending(draft.vivaOrderCode);
        }
        return dup;
      }
    }
    serverLog.error("order.rejected", {
      reason: "insert_after_payment",
      transactionId,
      error: error.message,
    });
    throw new Error(
      "Η πληρωμή μπορεί να έχει ολοκληρωθεί, αλλά δεν μπορέσαμε να καταχωρήσουμε την παραγγελία. Επικοινωνήστε με το κατάστημα.",
    );
  }

  const result = data as CompleteVivaOrderResult;

  serverLog.info("order.created", {
    orderId: result.id,
    orderNumber: result.order_number,
    payment: "card",
    total: draft.total,
    transactionId,
  });

  if (setAccessCookie) {
    await setOrderAccessCookie(result.id);
  }
  if (clearPending) {
    await clearCheckoutPending(draft.vivaOrderCode);
  }

  return result;
}

export async function completeVivaOrderByOrderCode(
  vivaOrderCode: string,
  transactionId: string,
  options: CompleteVivaOrderOptions = {},
): Promise<CompleteVivaOrderResult | null> {
  const existing = await findOrderByTransactionId(transactionId);
  if (existing) {
    if (options.setAccessCookie !== false) {
      await setOrderAccessCookie(existing.id);
    }
    if (options.clearPending !== false) {
      await clearCheckoutPending(vivaOrderCode);
    }
    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from("checkout_pending" as never)
    .select("checkout_token, expires_at")
    .eq("viva_order_code", vivaOrderCode)
    .maybeSingle();

  if (error || !data) {
    serverLog.warn("payment.webhook.no_pending", { vivaOrderCode, transactionId });
    return null;
  }

  const row = data as { checkout_token: string; expires_at: string };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    serverLog.warn("payment.webhook.expired_pending", { vivaOrderCode, transactionId });
    await supabaseAdmin
      .from("checkout_pending" as never)
      .delete()
      .eq("viva_order_code", vivaOrderCode);
    return null;
  }

  return completePaidVivaOrder(row.checkout_token, transactionId, {
    setAccessCookie: options.setAccessCookie ?? false,
    clearPending: options.clearPending ?? true,
  });
}

/**
 * Reconcile via Viva API order code when browser has no sessionStorage token.
 * Idempotent — returns existing order if webhook already completed.
 */
export async function completeVivaOrderByTransactionId(
  transactionId: string,
  options: CompleteVivaOrderOptions = {},
): Promise<CompleteVivaOrderResult | null> {
  const existing = await findOrderByTransactionId(transactionId);
  if (existing) {
    if (options.setAccessCookie !== false) {
      await setOrderAccessCookie(existing.id);
    }
    return existing;
  }

  const txn = await fetchVivaTransactionDetails(transactionId);
  if (!txn?.verified || !txn.orderCode) {
    serverLog.warn("payment.reconcile.unverified_txn", { transactionId });
    return null;
  }

  return completeVivaOrderByOrderCode(txn.orderCode, transactionId, options);
}

export type CardPaymentStatusResult =
  | { status: "ready"; order: CompleteVivaOrderResult }
  | { status: "pending" };

/** Browser polling — read-only; never creates orders (webhook is source of truth). */
export async function getCardPaymentOrderStatus(
  transactionId: string,
): Promise<CardPaymentStatusResult> {
  const order = await findOrderByTransactionId(transactionId);
  if (!order) {
    return { status: "pending" };
  }

  await setOrderAccessCookie(order.id);
  return { status: "ready", order };
}

/**
 * Fallback reconciliation when webhook is delayed or missed.
 * Idempotent — safe if webhook and browser call concurrently.
 */
export async function reconcileCardPayment(
  transactionId: string,
  checkoutToken?: string | null,
  options: CompleteVivaOrderOptions = {},
): Promise<CompleteVivaOrderResult | null> {
  const existing = await findOrderByTransactionId(transactionId);
  if (existing) {
    if (options.setAccessCookie !== false) {
      await setOrderAccessCookie(existing.id);
    }
    return existing;
  }

  if (checkoutToken) {
    try {
      return await completePaidVivaOrder(checkoutToken, transactionId, {
        setAccessCookie: options.setAccessCookie ?? true,
        clearPending: options.clearPending ?? true,
      });
    } catch (error) {
      serverLog.error("payment.reconcile.token_failed", {
        transactionId,
        error: error instanceof Error ? error.message : "unknown",
      });
      return null;
    }
  }

  return completeVivaOrderByTransactionId(transactionId, options);
}

/** Lookup order created by webhook when browser only has Viva order code (s). */
export async function findOrderByVivaOrderCode(
  vivaOrderCode: string,
): Promise<CompleteVivaOrderResult | null> {
  if (!vivaOrderCode) return null;

  const { data: pending } = await supabaseAdmin
    .from("checkout_pending" as never)
    .select("client_request_id")
    .eq("viva_order_code", vivaOrderCode)
    .maybeSingle();

  const clientRequestId = (pending as { client_request_id?: string } | null)?.client_request_id;
  if (!clientRequestId) return null;

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, order_number")
    .eq("client_request_id", clientRequestId)
    .maybeSingle();

  if (!order) return null;
  return order as CompleteVivaOrderResult;
}

export type CardPaymentOrderCodeStatus =
  | { status: "ready"; order: CompleteVivaOrderResult }
  | { status: "pending" };

/** Browser polling by Viva order code — read-only. */
export async function getCardPaymentOrderStatusByOrderCode(
  vivaOrderCode: string,
): Promise<CardPaymentOrderCodeStatus> {
  const order = await findOrderByVivaOrderCode(vivaOrderCode);
  if (!order) {
    return { status: "pending" };
  }

  await setOrderAccessCookie(order.id);
  return { status: "ready", order };
}

/** Reconcile when browser has order code and optional transaction id. */
export async function reconcileCardPaymentByOrderCode(
  vivaOrderCode: string,
  transactionId?: string | null,
  options: CompleteVivaOrderOptions = {},
): Promise<CompleteVivaOrderResult | null> {
  const existing = await findOrderByVivaOrderCode(vivaOrderCode);
  if (existing) {
    if (options.setAccessCookie !== false) {
      await setOrderAccessCookie(existing.id);
    }
    return existing;
  }

  if (!transactionId) return null;

  return completeVivaOrderByOrderCode(vivaOrderCode, transactionId, options);
}

export async function storePendingCheckout(
  vivaOrderCode: string,
  checkoutToken: string,
  clientRequestId: string,
  expiresAtSec: number = 60 * 30,
): Promise<void> {
  const expires_at = new Date(Date.now() + expiresAtSec * 1000).toISOString();

  const { error } = await supabaseAdmin.from("checkout_pending" as never).upsert(
    {
      viva_order_code: vivaOrderCode,
      checkout_token: checkoutToken,
      client_request_id: clientRequestId,
      expires_at,
    } as never,
    { onConflict: "viva_order_code" },
  );

  if (error) {
    serverLog.error("checkout.pending.store_failed", {
      vivaOrderCode,
      clientRequestId,
      error: error.message,
    });
  }
}

/** Resolve checkout token from viva order code (webhook / recovery). */
export async function resolveCheckoutTokenByOrderCode(
  vivaOrderCode: string,
): Promise<CheckoutTokenPayload | null> {
  const { data } = await supabaseAdmin
    .from("checkout_pending" as never)
    .select("checkout_token, expires_at")
    .eq("viva_order_code", vivaOrderCode)
    .maybeSingle();

  if (!data) return null;

  const row = data as { checkout_token: string; expires_at: string };
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  return verifyCheckoutToken(row.checkout_token);
}
