"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isUUID } from "@/shared/utils/uuid";
import { fetchDriverActiveDelivery } from "./driver-delivery-sync";

const ORDERS_TABLE = "orders" as never;
const ASSIGNMENTS_TABLE = "delivery_assignments" as never;

export type DriverAcceptableOrder = {
  id: string;
  order_number: string;
  status: string;
  delivery_status: string;
  driver_id: string | null;
  items: { name: string; qty: number }[];
  total: number;
  address: string;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
};

export type FetchAcceptableOrdersResult = {
  success: boolean;
  orders: DriverAcceptableOrder[];
  error?: string;
};

/**
 * Server-authoritative accept pool for idle drivers.
 * Returns empty when driver already has an active assignment (assigned work only via active delivery).
 * Eligibility mirrors accept_delivery_atomic preconditions:
 *   kitchen ready + delivery pending + no driver + no active assignment row.
 */
export async function fetchAcceptableOrdersForDriver(
  driverId: string,
): Promise<FetchAcceptableOrdersResult> {
  if (!isUUID(driverId)) {
    return { success: false, orders: [], error: "Invalid driver_id: UUID required" };
  }

  const active = await fetchDriverActiveDelivery(driverId);
  if (!active.success) {
    return {
      success: false,
      orders: [],
      error: active.error ?? "Failed to verify active delivery",
    };
  }
  if (active.assignment) {
    return { success: true, orders: [] };
  }

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from(ORDERS_TABLE)
    .select(
      "id, order_number, status, delivery_status, driver_id, items, total, address, lat, lng, created_at",
    )
    .eq("status", "ready")
    .eq("delivery_status", "pending")
    .is("driver_id", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (ordersError) {
    return { success: false, orders: [], error: ordersError.message };
  }

  const candidateOrders = (orders ?? []) as DriverAcceptableOrder[];
  if (candidateOrders.length === 0) {
    return { success: true, orders: [] };
  }

  const orderIds = candidateOrders.map((order) => order.id);
  const { data: activeAssignments, error: assignmentError } = await supabaseAdmin
    .from(ASSIGNMENTS_TABLE)
    .select("order_id")
    .in("order_id", orderIds)
    .is("delivered_at", null)
    .is("cancelled_at", null);

  if (assignmentError) {
    return { success: false, orders: [], error: assignmentError.message };
  }

  const blockedOrderIds = new Set(
    ((activeAssignments ?? []) as { order_id: string }[]).map((row) => row.order_id),
  );

  return {
    success: true,
    orders: candidateOrders.filter((order) => !blockedOrderIds.has(order.id)),
  };
}
