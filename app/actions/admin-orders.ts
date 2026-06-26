"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AdminOrder, AdminOrderListResult } from "@/features/admin/types/admin-order.types";
import { requireAdminCookie } from "./admin-auth";

const ORDERS_TABLE = "orders" as never;
const ADMIN_ORDER_LIMIT = 50;

/** Server-authoritative admin order list — bypasses RLS via service role. */
export async function getAllOrdersForAdmin(): Promise<AdminOrderListResult> {
  try {
    await requireAdminCookie();
  } catch {
    return { success: false, error: "Unauthorized — sign in again at /admin/login" };
  }

  const { data, error } = await supabaseAdmin
    .from(ORDERS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(ADMIN_ORDER_LIMIT);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, orders: (data ?? []) as AdminOrder[] };
}
