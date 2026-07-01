"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { DeliveryStatus } from "@/features/delivery/types/delivery.types";
import { requireDriverSession } from "./driver-login";
import { isUUID } from "@/shared/utils/uuid";
import { serverLog } from "@/lib/server/logger";

export async function driverTransitionAtomic(
  assignmentId: string,
  orderId: string,
  driverId: string,
  newStatus: Extract<DeliveryStatus, "picked_up" | "in_transit" | "arrived" | "delivered">,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireDriverSession().catch(() => null);
  if (!session || session.driverId !== driverId) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isUUID(assignmentId) || !isUUID(orderId) || !isUUID(driverId)) {
    return { success: false, error: "Invalid id parameters" };
  }

  const { error } = await (supabaseAdmin as any).rpc("transition_delivery_atomic", {
    p_order_id: orderId,
    p_assignment_id: assignmentId,
    p_driver_id: driverId,
    p_new_status: newStatus,
  });

  if (error) {
    serverLog.warn("driver.transition.failed", { assignmentId, orderId, driverId, error: error.message });
    return { success: false, error: "Could not update delivery status. Please try again." };
  }

  return { success: true };
}
