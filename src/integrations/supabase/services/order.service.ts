/**
 * Order service for Supabase operations
 */

// @ts-nocheck - Supabase types don't include new tables yet

import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

const KITCHEN_ORDER_STATUSES = new Set(["pending", "accepted", "preparing", "ready"]);

export interface CreateOrderInput {
  items: Array<{ name: string; price: number; qty: number; category?: string }>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  customer_name: string;
  customer_phone: string;
  address: string;
  address_notes?: string | null;
  lat?: number | null;
  lng?: number | null;
  payment_method: string;
  payment_status: string;
  notes?: string | null;
  status?: string;
  viva_transaction_id?: string | null;
  user_id?: string | null;
}

export interface OrderResult {
  id: string;
  order_number: string;
}

export async function createOrder(input: CreateOrderInput): Promise<OrderResult> {
  const status = input.status || "pending";
  if (!KITCHEN_ORDER_STATUSES.has(status)) {
    throw new Error(`orders.status is kitchen-only. Rejected status: ${status}`);
  }

  // @ts-ignore - Supabase types don't include new tables yet
  const payload: TablesInsert<"orders"> = {
    items: input.items as any,
    subtotal: input.subtotal,
    delivery_fee: input.delivery_fee,
    total: input.total,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    address: input.address,
    address_notes: input.address_notes || null,
    lat: input.lat || null,
    lng: input.lng || null,
    payment_method: input.payment_method,
    payment_status: input.payment_status,
    notes: input.notes || null,
    status,
    viva_transaction_id: input.viva_transaction_id || null,
    user_id: input.user_id || null,
  };

  const { data, error } = await supabase
    .from("orders")
    // @ts-ignore - Supabase types don't include new tables yet
    .insert(payload)
    .select("id, order_number")
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    throw new Error(`Database error: ${error.message || "Failed to save order"}`);
  }

  return data as OrderResult;
}

export async function getOrderById(id: string) {
  const { data, error } = await (supabase.rpc as any)("get_order_for_tracking", {
    order_uuid: id,
  });

  if (error) {
    console.error("Supabase fetch error:", error);
    throw new Error(`Failed to fetch order: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error("Order not found");
  }

  return row;
}

export async function getUserOrders(profileId: string) {
  const { data, error } = await supabase
    .from("orders" as any)
    .select("*")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase fetch error:", error);
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  return data;
}
