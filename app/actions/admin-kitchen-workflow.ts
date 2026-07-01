"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateOrderStatusTransition } from "@/features/delivery/services/workflow.service";
import type { OrderStatus } from "@/features/delivery/types/delivery.types";
import { requireAdminSession } from "./admin-auth";
import { serverLog } from "@/lib/server/logger";
import { isUUID } from "@/shared/utils/uuid";

const KITCHEN_ORDER_STATUSES = new Set(["pending", "accepted", "preparing", "ready"]);

export async function adminTransitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminSession();
  } catch {
    return { success: false, error: "Unauthorized — sign in again at /admin/login" };
  }

  if (!isUUID(orderId)) {
    return { success: false, error: "Invalid order id" };
  }

  if (!KITCHEN_ORDER_STATUSES.has(newStatus)) {
    return {
      success: false,
      error: `orders.status is kitchen-only. Rejected delivery status: ${newStatus}`,
    };
  }

  const { data: order, error: fetchError } = await supabaseAdmin
    .from("orders" as never)
    .select("status")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    return {
      success: false,
      error: fetchError?.message ?? "Order not found",
    };
  }

  const currentStatus = (order as { status: string }).status as OrderStatus;
  const validation = validateOrderStatusTransition(currentStatus, newStatus);
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  const { error: rpcError } = await (supabaseAdmin as never as { rpc: Function }).rpc(
    "admin_transition_order_status_atomic",
    {
      p_order_id: orderId,
      p_expected_status: currentStatus,
      p_new_status: newStatus,
    },
  );

  if (rpcError) {
    serverLog.warn("order.rejected", {
      reason: "kitchen_transition_race",
      orderId,
      from: currentStatus,
      to: newStatus,
      error: rpcError.message,
    });
    return {
      success: false,
      error: rpcError.message ?? "Order was not updated — status may have changed",
    };
  }

  return { success: true };
}
