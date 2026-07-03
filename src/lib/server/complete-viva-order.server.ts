/**
 * Shared Viva order completion — pre-created pending orders updated on payment (B+C architecture).
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  fetchVivaTransactionDetails,
  fetchVivaTransactionIdByOrderCode,
  assertVivaPaymentMatchesOrder,
} from "@/integrations/viva/services/payment.server";
import { verifyCheckoutToken, type CheckoutTokenPayload } from "@/lib/server/checkout-token.server";
import { setOrderAccessCookie } from "@/lib/server/order-access.server";
import { expireAbandonedCardPaymentOrders } from "@/lib/server/card-payment-cleanup.server";
import { syncLatestSuccessfulOrderToFavorite } from "@/lib/server/favorite-orders.server";
import { serverLog } from "@/lib/server/logger";

export type CompleteVivaOrderResult = { id: string; order_number: string };

export type CompleteVivaOrderOptions = {
  setAccessCookie?: boolean;
  clearPending?: boolean;
};

export type CardPaymentReturnResult =
  | { status: "track"; order: CompleteVivaOrderResult; path: string }
  | { status: "pending"; orderId?: string; path: string }
  | { status: "checkout"; path: string; eventId?: string }
  | { status: "error"; message: string; path: string };

type OrderRow = CompleteVivaOrderResult & {
  payment_status: string;
  client_request_id: string | null;
  viva_transaction_id: string | null;
};

/** Read-only lookup — safe for browser polling. */
export async function findOrderByTransactionId(
  transactionId: string,
): Promise<CompleteVivaOrderResult | null> {
  if (!transactionId) return null;

  const { data } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, payment_status")
    .eq("viva_transaction_id", transactionId)
    .maybeSingle();

  if (!data) return null;
  return { id: (data as OrderRow).id, order_number: (data as OrderRow).order_number };
}

export async function findOrderByClientRequestId(
  clientRequestId: string,
): Promise<OrderRow | null> {
  if (!clientRequestId) return null;

  const { data } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, payment_status, client_request_id, viva_transaction_id")
    .eq("client_request_id", clientRequestId)
    .maybeSingle();

  if (!data) return null;
  return data as OrderRow;
}

async function findOrderRowById(orderId: string): Promise<OrderRow | null> {
  const { data } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, payment_status, client_request_id, viva_transaction_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!data) return null;
  return data as OrderRow;
}

async function findExistingOrder(
  transactionId: string,
  clientRequestId: string,
): Promise<OrderRow | null> {
  const { data: byTxn } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, payment_status, client_request_id, viva_transaction_id")
    .eq("viva_transaction_id", transactionId)
    .maybeSingle();

  if (byTxn) return byTxn as OrderRow;

  return findOrderByClientRequestId(clientRequestId);
}

async function clearCheckoutPending(vivaOrderCode: string | null | undefined): Promise<void> {
  if (!vivaOrderCode) return;
  await supabaseAdmin
    .from("checkout_pending" as never)
    .delete()
    .eq("viva_order_code", vivaOrderCode);
}

function isPaid(row: Pick<OrderRow, "payment_status">): boolean {
  return row.payment_status === "paid";
}

/**
 * Idempotent: marks pre-created pending order as paid. Never inserts a new order row.
 */
async function markOrderPaid(
  orderId: string,
  transactionId: string,
  options: CompleteVivaOrderOptions = {},
): Promise<CompleteVivaOrderResult | null> {
  const { setAccessCookie = true, clearPending } = options;

  const existing = await findOrderRowById(orderId);
  if (!existing) return null;

  if (isPaid(existing)) {
    if (existing.viva_transaction_id && existing.viva_transaction_id !== transactionId) {
      serverLog.warn("payment.order.updated", {
        orderId,
        reason: "already_paid_different_txn",
        existingTxn: existing.viva_transaction_id,
        incomingTxn: transactionId,
      });
    }
    if (setAccessCookie) await setOrderAccessCookie(existing.id);
    return { id: existing.id, order_number: existing.order_number };
  }

  if (existing.payment_status === "cancelled") {
    serverLog.warn("payment.order.updated", {
      orderId,
      reason: "cancelled_order_payment_attempt",
      transactionId,
    });
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({
      payment_status: "paid",
      viva_transaction_id: transactionId,
    } as never)
    .eq("id", orderId)
    .eq("payment_status", "pending")
    .select("id, order_number")
    .maybeSingle();

  if (error) {
    serverLog.error("payment.failed", {
      step: "mark_paid",
      orderId,
      transactionId,
      error: error.message,
    });
    return null;
  }

  if (!data) {
    const raced = await findOrderRowById(orderId);
    if (raced && isPaid(raced)) {
      if (setAccessCookie) await setOrderAccessCookie(raced.id);
      return { id: raced.id, order_number: raced.order_number };
    }
    return null;
  }

  const result = data as CompleteVivaOrderResult;

  serverLog.info("payment.order.updated", {
    orderId: result.id,
    orderNumber: result.order_number,
    transactionId,
    paymentStatus: "paid",
  });

  serverLog.info("payment.success", {
    orderId: result.id,
    orderNumber: result.order_number,
    transactionId,
  });

  if (setAccessCookie) await setOrderAccessCookie(result.id);
  await syncLatestSuccessfulOrderToFavorite(result.id);
  return result;
}

export async function completePaidVivaOrder(
  checkoutToken: string,
  transactionId: string,
  options: CompleteVivaOrderOptions = {},
): Promise<CompleteVivaOrderResult> {
  const { clearPending = true } = options;

  if (!transactionId) throw new Error("Missing transaction ID");
  if (!checkoutToken) throw new Error("Missing checkout token");

  const draft = verifyCheckoutToken(checkoutToken);
  if (!draft) {
    serverLog.error("order.rejected", { reason: "invalid_checkout_token", transactionId });
    throw new Error("Η πληρωμή δεν επαληθεύτηκε. Επικοινωνήστε μαζί μας.");
  }

  const existing = await findExistingOrder(transactionId, draft.clientRequestId);
  if (existing && isPaid(existing)) {
    if (options.setAccessCookie !== false) await setOrderAccessCookie(existing.id);
    if (clearPending) await clearCheckoutPending(draft.vivaOrderCode);
    return { id: existing.id, order_number: existing.order_number };
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

  const order = existing ?? (await findOrderByClientRequestId(draft.clientRequestId));
  if (!order) {
    serverLog.error("order.rejected", {
      reason: "pending_order_missing",
      transactionId,
      clientRequestId: draft.clientRequestId,
    });
    throw new Error(
      "Η πληρωμή μπορεί να έχει ολοκληρωθεί, αλλά δεν μπορέσαμε να βρούμε την παραγγελία. Επικοινωνήστε με το κατάστημα.",
    );
  }

  const updated = await markOrderPaid(order.id, transactionId, options);
  if (!updated) {
    throw new Error(
      "Η πληρωμή μπορεί να έχει ολοκληρωθεί, αλλά δεν μπορέσαμε να ενημερώσουμε την παραγγελία. Επικοινωνήστε με το κατάστημα.",
    );
  }

  if (clearPending) await clearCheckoutPending(draft.vivaOrderCode);

  serverLog.info("order.created", {
    orderId: updated.id,
    orderNumber: updated.order_number,
    payment: "card",
    total: draft.total,
    transactionId,
    note: "payment_marked_paid",
  });

  serverLog.info("checkout.completed", {
    orderId: updated.id,
    orderNumber: updated.order_number,
    payment: "card",
    transactionId,
    clientRequestId: draft.clientRequestId,
  });

  return updated;
}

export async function completeVivaOrderByOrderCode(
  vivaOrderCode: string,
  transactionId: string,
  options: CompleteVivaOrderOptions = {},
): Promise<CompleteVivaOrderResult | null> {
  const existing = await findOrderByTransactionId(transactionId);
  if (existing) {
    if (options.setAccessCookie !== false) await setOrderAccessCookie(existing.id);
    if (options.clearPending !== false) await clearCheckoutPending(vivaOrderCode);
    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from("checkout_pending" as never)
    .select("checkout_token, expires_at, client_request_id")
    .eq("viva_order_code", vivaOrderCode)
    .maybeSingle();

  if (error || !data) {
    serverLog.warn("payment.webhook.no_pending", { vivaOrderCode, transactionId });
    return null;
  }

  const row = data as {
    checkout_token: string;
    expires_at: string;
    client_request_id: string;
  };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    serverLog.warn("payment.webhook.expired_pending", { vivaOrderCode, transactionId });
    await supabaseAdmin
      .from("checkout_pending" as never)
      .delete()
      .eq("viva_order_code", vivaOrderCode);
    return null;
  }

  const pendingOrder = await findOrderByClientRequestId(row.client_request_id);
  if (pendingOrder && isPaid(pendingOrder)) {
    if (options.setAccessCookie !== false) await setOrderAccessCookie(pendingOrder.id);
    if (options.clearPending !== false) await clearCheckoutPending(vivaOrderCode);
    return { id: pendingOrder.id, order_number: pendingOrder.order_number };
  }

  try {
    return await completePaidVivaOrder(row.checkout_token, transactionId, {
      setAccessCookie: options.setAccessCookie ?? false,
      clearPending: options.clearPending ?? true,
    });
  } catch (error) {
    serverLog.error("payment.reconcile.token_failed", {
      vivaOrderCode,
      transactionId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export async function completeVivaOrderByTransactionId(
  transactionId: string,
  options: CompleteVivaOrderOptions = {},
): Promise<CompleteVivaOrderResult | null> {
  const existing = await findOrderByTransactionId(transactionId);
  if (existing) {
    if (options.setAccessCookie !== false) await setOrderAccessCookie(existing.id);
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
  { status: "ready"; order: CompleteVivaOrderResult } | { status: "pending" };

export async function getCardPaymentOrderStatus(
  transactionId: string,
): Promise<CardPaymentStatusResult> {
  const { data } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, payment_status")
    .eq("viva_transaction_id", transactionId)
    .maybeSingle();

  if (!data || (data as OrderRow).payment_status !== "paid") {
    return { status: "pending" };
  }

  const order = data as CompleteVivaOrderResult;
  await setOrderAccessCookie(order.id);
  return { status: "ready", order };
}

export async function reconcileCardPayment(
  transactionId: string,
  checkoutToken?: string | null,
  options: CompleteVivaOrderOptions = {},
): Promise<CompleteVivaOrderResult | null> {
  const status = await getCardPaymentOrderStatus(transactionId);
  if (status.status === "ready") return status.order;

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

export async function findOrderByVivaOrderCode(vivaOrderCode: string): Promise<OrderRow | null> {
  if (!vivaOrderCode) return null;

  const { data: pending } = await supabaseAdmin
    .from("checkout_pending" as never)
    .select("client_request_id")
    .eq("viva_order_code", vivaOrderCode)
    .maybeSingle();

  const clientRequestId = (pending as { client_request_id?: string } | null)?.client_request_id;
  if (!clientRequestId) return null;

  return findOrderByClientRequestId(clientRequestId);
}

export type CardPaymentOrderCodeStatus =
  { status: "ready"; order: CompleteVivaOrderResult } | { status: "pending"; orderId?: string };

export async function getCardPaymentOrderStatusByOrderCode(
  vivaOrderCode: string,
): Promise<CardPaymentOrderCodeStatus> {
  const order = await findOrderByVivaOrderCode(vivaOrderCode);
  if (!order) return { status: "pending" };

  if (isPaid(order)) {
    await setOrderAccessCookie(order.id);
    return { status: "ready", order: { id: order.id, order_number: order.order_number } };
  }

  return { status: "pending", orderId: order.id };
}

async function recoverTransactionIdForOrderCode(vivaOrderCode: string): Promise<string | null> {
  const recovered = await fetchVivaTransactionIdByOrderCode(vivaOrderCode);
  if (!recovered?.verified || !recovered.transactionId) {
    serverLog.info("payment.reconcile.recovery", {
      vivaOrderCode,
      recovered: false,
    });
    return null;
  }

  serverLog.info("payment.reconcile.recovery", {
    vivaOrderCode,
    transactionId: recovered.transactionId,
    recovered: true,
  });

  return recovered.transactionId;
}

export async function reconcileCardPaymentByOrderCode(
  vivaOrderCode: string,
  transactionId?: string | null,
  options: CompleteVivaOrderOptions = {},
): Promise<CompleteVivaOrderResult | null> {
  const status = await getCardPaymentOrderStatusByOrderCode(vivaOrderCode);
  if (status.status === "ready") return status.order;

  let txnId = transactionId?.trim() || null;
  if (!txnId) {
    txnId = await recoverTransactionIdForOrderCode(vivaOrderCode);
  }

  if (!txnId) return null;

  return completeVivaOrderByOrderCode(vivaOrderCode, txnId, options);
}

/**
 * Central return-path resolver — browser, refresh, and missing-param recovery.
 */
export async function finalizeCardPaymentReturn(input: {
  transactionId?: string | null;
  vivaOrderCode?: string | null;
  orderId?: string | null;
  checkoutToken?: string | null;
  eventId?: string | null;
}): Promise<CardPaymentReturnResult> {
  await expireAbandonedCardPaymentOrders();

  const transactionId = input.transactionId?.trim() || null;
  const vivaOrderCode = input.vivaOrderCode?.trim() || null;
  const orderId = input.orderId?.trim() || null;
  const eventId = input.eventId?.trim() || null;

  serverLog.info("payment.return.resolved", {
    path: "finalize_start",
    hasTransactionId: Boolean(transactionId),
    hasOrderCode: Boolean(vivaOrderCode),
    hasOrderId: Boolean(orderId),
    eventId: eventId ?? undefined,
  });

  if (orderId) {
    const row = await findOrderRowById(orderId);
    if (row && isPaid(row)) {
      await setOrderAccessCookie(row.id);
      return {
        status: "track",
        order: { id: row.id, order_number: row.order_number },
        path: "order_id_paid",
      };
    }
  }

  if (transactionId) {
    const reconciled = await reconcileCardPayment(transactionId, input.checkoutToken, {
      setAccessCookie: true,
      clearPending: true,
    });
    if (reconciled) {
      return { status: "track", order: reconciled, path: "transaction_id" };
    }
  }

  if (vivaOrderCode) {
    const byCode = await reconcileCardPaymentByOrderCode(vivaOrderCode, transactionId, {
      setAccessCookie: true,
      clearPending: true,
    });
    if (byCode) {
      return { status: "track", order: byCode, path: "order_code_recovery" };
    }

    const pending = await getCardPaymentOrderStatusByOrderCode(vivaOrderCode);
    if (pending.status === "ready") {
      return { status: "track", order: pending.order, path: "order_code_paid" };
    }

    if (pending.orderId && !eventId) {
      serverLog.info("payment.return.pending", {
        orderId: pending.orderId,
        vivaOrderCode,
      });
      return { status: "pending", orderId: pending.orderId, path: "awaiting_verification" };
    }
  }

  if (eventId) {
    serverLog.info("payment.return.failed", { eventId, vivaOrderCode: vivaOrderCode ?? undefined });
    return { status: "checkout", path: "viva_failure", eventId };
  }

  if (transactionId || vivaOrderCode) {
    return {
      status: "error",
      message:
        "Η πληρωμή μπορεί να έχει ολοκληρωθεί, αλλά δεν μπορέσαμε να την επιβεβαιώσουμε ακόμα. Δοκιμάστε να ανανεώσετε τη σελίδα.",
      path: "verification_timeout",
    };
  }

  return {
    status: "error",
    message:
      "Δεν ολοκληρώθηκε παραγγελία. Αν προσπάθησες να πληρώσεις με κάρτα, δεν έχει επιβεβαιωθεί πληρωμή.",
    path: "missing_params",
  };
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
