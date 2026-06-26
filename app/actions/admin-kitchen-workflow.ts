"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateOrderStatusTransition } from "@/features/delivery/services/workflow.service";
import type { OrderStatus } from "@/features/delivery/types/delivery.types";
import { requireAdminCookie } from "./admin-auth";

const KITCHEN_ORDER_STATUSES = new Set(["pending", "accepted", "preparing", "ready"]);
const ORDERS_TABLE = "orders" as never;

type OrderStatusRow = {
  status: string;
};

type OrderUpdateRow = {
  id: string;
  status: string;
};

export async function adminTransitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminCookie();
  } catch {
    return { success: false, error: "Unauthorized — sign in again at /admin/login" };
  }

  if (!KITCHEN_ORDER_STATUSES.has(newStatus)) {
    return {
      success: false,
      error: `orders.status is kitchen-only. Rejected delivery status: ${newStatus}`,
    };
  }

  const { data: order, error: fetchError } = await supabaseAdmin
    .from(ORDERS_TABLE)
    .select("status")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    return {
      success: false,
      error: fetchError?.message ?? "Order not found",
    };
  }

  const currentStatus = (order as OrderStatusRow).status as OrderStatus;
  const validation = validateOrderStatusTransition(currentStatus, newStatus);
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from(ORDERS_TABLE)
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", orderId)
    .select("id, status")
    .single();

  const updatedRow = updated as OrderUpdateRow | null;

  if (updateError || !updatedRow || updatedRow.status !== newStatus) {
    return {
      success: false,
      error: updateError?.message ?? "Order was not updated",
    };
  }

  return { success: true };
}
