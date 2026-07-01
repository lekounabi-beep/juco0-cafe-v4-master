"use server";

import { headers } from "next/headers";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeOrderTotalsFromDatabase, type CartLineInput } from "@/lib/server/pricing.server";
import {
  issueCheckoutToken,
  attachVivaOrderCodeToToken,
  verifyCheckoutToken,
} from "@/lib/server/checkout-token.server";
import { setOrderAccessCookie } from "@/lib/server/order-access.server";
import { storePendingCheckout } from "@/lib/server/complete-viva-order.server";
import { createVivaPaymentOrderServer } from "@/integrations/viva/services/payment.server";
import { serverLog } from "@/lib/server/logger";
import { isUUID } from "@/shared/utils/uuid";
import type { TablesInsert } from "@/integrations/supabase/types";

export type CheckoutCustomerInput = {
  fulfillment: "pickup" | "delivery";
  cartItems: CartLineInput[];
  customer_name: string;
  customer_phone: string;
  address: string;
  address_notes?: string | null;
  lat?: number | null;
  lng?: number | null;
  payment_method: string;
  notes?: string | null;
  user_id?: string | null;
};

async function resolveRedirectUrl(): Promise<string> {
  const envUrl = process.env.VIVA_REDIRECT_URL;
  if (envUrl) return envUrl;

  const headerStore = await headers();
  const protocol = headerStore.get("x-forwarded-proto") || "https";
  const host =
    headerStore.get("host") ||
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, "") ||
    "localhost:8080";
  return `${protocol}://${host}/order-success`;
}

async function insertOrderIdempotent(
  payload: TablesInsert<"orders">,
  clientRequestId: string,
): Promise<{ id: string; order_number: string }> {
  const withIdempotency = { ...payload, client_request_id: clientRequestId } as TablesInsert<"orders">;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert(withIdempotency as never)
    .select("id, order_number")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabaseAdmin
        .from("orders")
        .select("id, order_number")
        .eq("client_request_id", clientRequestId)
        .maybeSingle();

      if (existing) {
        serverLog.info("order.idempotent_hit", {
          clientRequestId,
          orderId: (existing as { id: string }).id,
        });
        return existing as { id: string; order_number: string };
      }
    }
    serverLog.error("order.rejected", { reason: "insert_failed", error: error.message });
    throw new Error("Δεν μπορέσαμε να καταχωρήσουμε την παραγγελία.");
  }

  return data as { id: string; order_number: string };
}

export async function submitCodOrderServer(
  input: CheckoutCustomerInput,
  clientRequestId: string,
): Promise<{ id: string; order_number: string }> {
  if (!clientRequestId || !isUUID(clientRequestId)) {
    throw new Error("Invalid client request id");
  }

  if (input.payment_method !== "cod") {
    serverLog.warn("order.rejected", {
      reason: "invalid_payment_method_cod_only",
      payment_method: input.payment_method,
      clientRequestId,
    });
    throw new Error("Invalid payment method for COD checkout.");
  }

  const priced = await computeOrderTotalsFromDatabase(input.cartItems, input.fulfillment);

  const orderPayload: TablesInsert<"orders"> = {
    items: priced.items as never,
    subtotal: priced.subtotal,
    delivery_fee: priced.delivery_fee,
    total: priced.total,
    customer_name: input.customer_name.trim(),
    customer_phone: input.customer_phone,
    address: input.address,
    address_notes: input.address_notes ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    payment_method: "cod",
    payment_status: "pending",
    notes: input.notes ?? null,
    status: "pending",
    user_id: input.user_id ?? null,
  };

  const result = await insertOrderIdempotent(orderPayload, clientRequestId);

  serverLog.info("order.created", {
    orderId: result.id,
    orderNumber: result.order_number,
    payment: input.payment_method,
    total: priced.total,
    clientRequestId,
  });

  await setOrderAccessCookie(result.id);

  return result;
}

export async function initiateCardCheckoutServer(
  input: CheckoutCustomerInput,
  clientRequestId: string,
): Promise<{ checkoutToken: string; orderCode: string }> {
  if (!clientRequestId || !isUUID(clientRequestId)) {
    throw new Error("Invalid client request id");
  }

  const priced = await computeOrderTotalsFromDatabase(input.cartItems, input.fulfillment);

  const redirectUrl = await resolveRedirectUrl();
  const vivaResult = await createVivaPaymentOrderServer(priced.total, redirectUrl);

  if ("error" in vivaResult) {
    serverLog.error("payment.failed", { reason: "viva_order_create", clientRequestId });
    throw new Error("Δεν μπορέσαμε να ξεκινήσουμε την πληρωμή.");
  }

  let checkoutToken = issueCheckoutToken({
    clientRequestId,
    items: priced.items,
    subtotal: priced.subtotal,
    delivery_fee: priced.delivery_fee,
    total: priced.total,
    customer_name: input.customer_name.trim(),
    customer_phone: input.customer_phone,
    address: input.address,
    address_notes: input.address_notes ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    payment_method: "card",
    notes: input.notes ?? null,
    user_id: input.user_id ?? null,
    fulfillment: input.fulfillment,
  });

  checkoutToken = attachVivaOrderCodeToToken(checkoutToken, vivaResult.orderCode);

  await storePendingCheckout(vivaResult.orderCode, checkoutToken, clientRequestId);

  serverLog.info("payment.initiated", {
    clientRequestId,
    orderCode: vivaResult.orderCode,
    total: priced.total,
  });

  return { checkoutToken, orderCode: vivaResult.orderCode };
}

/** Used by completeVivaOrder — re-verify token integrity. */
export { verifyCheckoutToken };
