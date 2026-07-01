"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { FULL_TRACKING_FIELDS, resolveOrderTrackingAccess } from "@/lib/server/order-access.server";
import { isUUID } from "@/shared/utils/uuid";

export async function getOrderForTrackingServer(orderId: string): Promise<Record<string, unknown> | null> {
  if (!isUUID(orderId)) return null;

  const fullAccess = await resolveOrderTrackingAccess(orderId);

  const selectFields = fullAccess
    ? FULL_TRACKING_FIELDS.join(", ")
    : "id, order_number, status, delivery_status, driver_id, items, subtotal, delivery_fee, total, payment_method, payment_status, created_at";

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(selectFields)
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;

  if (!fullAccess) {
    return {
      ...row,
      customer_name: row.customer_name ?? "",
      customer_phone: "",
      address: "",
      address_notes: null,
      lat: null,
      lng: null,
      notes: null,
    };
  }

  return row;
}
