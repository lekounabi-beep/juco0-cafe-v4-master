"use server";

import {
  completePaidVivaOrder,
  finalizeCardPaymentReturn,
  getCardPaymentOrderStatus,
  getCardPaymentOrderStatusByOrderCode,
  reconcileCardPayment,
  reconcileCardPaymentByOrderCode,
  type CardPaymentReturnResult,
  type CompleteVivaOrderResult,
} from "@/lib/server/complete-viva-order.server";

export async function completeVivaOrder(
  checkoutToken: string,
  transactionId: string,
): Promise<{ id: string; order_number: string }> {
  return completePaidVivaOrder(checkoutToken, transactionId, {
    setAccessCookie: true,
    clearPending: true,
  });
}

export async function getCardPaymentOrderStatusAction(
  transactionId: string,
): Promise<{ status: "ready"; order: CompleteVivaOrderResult } | { status: "pending" }> {
  return getCardPaymentOrderStatus(transactionId);
}

/** Idempotent return-path completion — webhook-safe, token optional. */
export async function reconcileVivaPaymentReturn(
  transactionId: string,
  checkoutToken?: string | null,
): Promise<CompleteVivaOrderResult | null> {
  return reconcileCardPayment(transactionId, checkoutToken, {
    setAccessCookie: true,
    clearPending: true,
  });
}

export async function getCardPaymentOrderStatusByOrderCodeAction(
  vivaOrderCode: string,
): Promise<{ status: "ready"; order: CompleteVivaOrderResult } | { status: "pending" }> {
  return getCardPaymentOrderStatusByOrderCode(vivaOrderCode);
}

export async function reconcileVivaPaymentByOrderCode(
  vivaOrderCode: string,
  transactionId?: string | null,
): Promise<CompleteVivaOrderResult | null> {
  return reconcileCardPaymentByOrderCode(vivaOrderCode, transactionId, {
    setAccessCookie: true,
    clearPending: true,
  });
}

export async function finalizeCardPaymentReturnAction(input: {
  transactionId?: string | null;
  vivaOrderCode?: string | null;
  orderId?: string | null;
  checkoutToken?: string | null;
  eventId?: string | null;
}): Promise<CardPaymentReturnResult> {
  return finalizeCardPaymentReturn(input);
}
