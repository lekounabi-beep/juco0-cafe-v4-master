/**
 * Order service for Supabase operations (read-only from client).
 * Order creation is server-only — use checkout server actions.
 */

import { supabase } from "@/integrations/supabase/client";
import { getOrderForTrackingServer } from "@app/actions/order-tracking";

export async function getOrderById(id: string) {
  const row = await getOrderForTrackingServer(id);

  if (!row) {
    throw new Error("Order not found");
  }

  return row;
}

export async function getUserOrders(profileId: string) {
  const { data, error } = await supabase
    .from("orders" as never)
    .select("*")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch orders");
  }

  return data;
}
