"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isUUID } from "@/shared/utils/uuid";
import { requireDriverSession } from "./driver-login";
import { serverLog } from "@/lib/server/logger";

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

export type DriverAcceptOrderResult = {
  success: boolean;
  assignment?: AssignmentRow;
  error?: string;
};

function formatDbError(error: { message?: string; details?: string; hint?: string }): string {
  return [error.message, error.details, error.hint].filter(Boolean).join(" — ") || "Database error";
}

export async function driverAcceptOrder(
  orderId: string,
  driverId: string,
): Promise<DriverAcceptOrderResult> {
  const session = await requireDriverSession().catch(() => null);
  if (!session || session.driverId !== driverId) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isUUID(orderId)) {
    return { success: false, error: "Invalid order_id: UUID required" };
  }
  if (!isUUID(driverId)) {
    return { success: false, error: "Invalid driver_id: UUID required" };
  }

  const { data, error } = await supabaseAdmin.rpc("accept_delivery_atomic", {
    p_order_id: orderId,
    p_driver_id: driverId,
  });

  if (error) {
    serverLog.warn("driver.assignment.failed", { orderId, driverId, error: error.message });
    return { success: false, error: "Could not accept order. Please try again." };
  }

  const assignment = Array.isArray(data) ? data[0] : data;
  if (!assignment) {
    return { success: false, error: "Accept RPC returned no assignment row" };
  }

  serverLog.info("driver.assignment.accepted", { orderId, driverId, assignmentId: assignment.id });

  return { success: true, assignment: assignment as AssignmentRow };
}
