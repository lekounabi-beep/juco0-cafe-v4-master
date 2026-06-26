"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { DeliveryStatus } from "@/features/delivery/types/delivery.types";

type SupabaseDbError = {
  message?: string;
};

/** Single atomic milestone: assignment timestamp + derived order fields (+ driver online on delivered). */
export async function driverTransitionAtomic(
  assignmentId: string,
  orderId: string,
  driverId: string,
  newStatus: Extract<DeliveryStatus, "picked_up" | "in_transit" | "arrived" | "delivered">,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabaseAdmin as any).rpc("transition_delivery_atomic", {
    p_order_id: orderId,
    p_assignment_id: assignmentId,
    p_driver_id: driverId,
    p_new_status: newStatus,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
