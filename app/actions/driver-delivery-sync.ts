"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireDriverSession } from "./driver-login";
import { isUUID } from "@/shared/utils/uuid";
import { assignmentStatusFromTimestamps } from "@/shared/utils/order-fields";
import {
  DRIVER_ORDER_SELECT,
  type DriverOrderDetails,
} from "@/features/delivery/types/driver-order.types";

export type DriverActiveDeliveryPayload = {
  id: string;
  order_id: string;
  driver_id: string;
  assigned_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  started_delivery_at: string | null;
  arrived_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason?: string | null;
  status: string;
  order?: DriverOrderDetails;
};

export type FetchDriverActiveDeliveryResult = {
  success: boolean;
  assignment: DriverActiveDeliveryPayload | null;
  error?: string;
};

function formatDbError(error: { message?: string; details?: string; hint?: string }): string {
  return [error.message, error.details, error.hint].filter(Boolean).join(" — ") || "Database error";
}

/**
 * Authoritative active delivery fetch (service role).
 * Device-login drivers have no Supabase auth session — client RLS queries return empty.
 */
export async function fetchDriverActiveDelivery(
  driverId: string,
): Promise<FetchDriverActiveDeliveryResult> {
  const session = await requireDriverSession().catch(() => null);
  if (!session || session.driverId !== driverId) {
    return { success: false, assignment: null, error: "Unauthorized" };
  }

  if (!isUUID(driverId)) {
    return { success: false, assignment: null, error: "Invalid driver_id: UUID required" };
  }

  const { data: rows, error } = await supabaseAdmin
    .from("delivery_assignments")
    .select("*")
    .eq("driver_id", driverId)
    .is("delivered_at", null)
    .is("cancelled_at", null)
    .order("assigned_at", { ascending: false })
    .limit(1);

  if (error) {
    return { success: false, assignment: null, error: formatDbError(error) };
  }

  const list = (rows ?? []) as Record<string, unknown>[];
  if (list.length === 0) {
    return { success: true, assignment: null };
  }

  const row = list[0];
  const orderId = row.order_id as string;

  const { data: orderData, error: orderError } = await supabaseAdmin
    .from("orders")
    .select(DRIVER_ORDER_SELECT)
    .eq("id", orderId)
    .single();

  if (orderError) {
    return { success: false, assignment: null, error: formatDbError(orderError) };
  }

  const order = orderData as DriverOrderDetails;
  if (order.driver_id && order.driver_id !== driverId) {
    return { success: false, assignment: null, error: "Unauthorized" };
  }

  const assignment: DriverActiveDeliveryPayload = {
    ...(row as DriverActiveDeliveryPayload),
    status: assignmentStatusFromTimestamps(
      row as Parameters<typeof assignmentStatusFromTimestamps>[0],
    ),
    order,
  };

  return { success: true, assignment };
}
