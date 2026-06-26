"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isUUID } from "@/shared/utils/uuid";

type AssignmentRow = {
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
};

type SupabaseDbError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};


export type DriverAcceptOrderResult = {
  success: boolean;
  assignment?: AssignmentRow;
  error?: string;
};

function formatDbError(error: SupabaseDbError): string {
  return [error.message, error.details, error.hint].filter(Boolean).join(" — ") || "Database error";
}

function logDev(payload: unknown, error?: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error("[driverAcceptOrder]", payload, error);
  }
}

/**
 * Atomic driver accept: creates assignment + assigns order + sets driver BUSY.
 * Uses service role — safe for device-login drivers without Supabase auth session.
 */
export async function driverAcceptOrder(
  orderId: string,
  driverId: string,
): Promise<DriverAcceptOrderResult> {
  if (!isUUID(orderId)) {
    return { success: false, error: "Invalid order_id: UUID required" };
  }
  if (!isUUID(driverId)) {
    return { success: false, error: "Invalid driver_id: UUID required (drivers.id from profile)" };
  }

  const { data, error } = await (supabaseAdmin as any).rpc("accept_delivery_atomic", {
    p_order_id: orderId,
    p_driver_id: driverId,
  });

  if (error) {
    logDev({ orderId, driverId, step: "accept_delivery_atomic" }, error);
    return { success: false, error: formatDbError(error) };
  }

  const assignment = Array.isArray(data) ? data[0] : data;
  if (!assignment) {
    return { success: false, error: "Accept RPC returned no assignment row" };
  }

  return { success: true, assignment: assignment as AssignmentRow };
}
