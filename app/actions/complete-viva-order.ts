"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@/integrations/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { verifyVivaTransactionServer } from "@/integrations/viva/services/payment.server";
import type { CreateOrderInput } from "@/integrations/supabase/services/order.service";
import type { TablesInsert } from "@/integrations/supabase/types";

function isAuthSessionMissingError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AuthSessionMissingError" || error.message.includes("Auth session missing"))
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && !isAuthSessionMissingError(error)) {
    console.error("Admin auth check failed:", error);
  }

  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function completeVivaOrder(
  pendingOrder: CreateOrderInput,
  transactionId: string,
): Promise<{ id: string; order_number: string }> {
  if (!transactionId) {
    throw new Error("Missing transaction ID");
  }

  const { data: existing } = await supabaseAdmin
    .from("orders")
    .select("id, order_number")
    .eq("viva_transaction_id", transactionId)
    .maybeSingle();

  if (existing) {
    return existing as { id: string; order_number: string };
  }

  const verified = await verifyVivaTransactionServer(transactionId);
  if (!verified) {
    throw new Error("Η πληρωμή δεν επαληθεύτηκε. Επικοινωνήστε μαζί μας.");
  }

  const orderPayload: TablesInsert<"orders"> = {
    items: pendingOrder.items,
    subtotal: pendingOrder.subtotal,
    delivery_fee: pendingOrder.delivery_fee,
    total: pendingOrder.total,
    customer_name: pendingOrder.customer_name,
    customer_phone: pendingOrder.customer_phone,
    address: pendingOrder.address,
    address_notes: pendingOrder.address_notes ?? null,
    lat: pendingOrder.lat ?? null,
    lng: pendingOrder.lng ?? null,
    payment_method: "card",
    payment_status: "paid",
    notes: pendingOrder.notes ?? null,
    status: "pending",
    viva_transaction_id: transactionId,
    user_id: pendingOrder.user_id ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert(orderPayload as never)
    .select("id, order_number")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: dup } = await supabaseAdmin
        .from("orders")
        .select("id, order_number")
        .eq("viva_transaction_id", transactionId)
        .maybeSingle();
      if (dup) return dup as { id: string; order_number: string };
    }
    throw new Error(
      "Η πληρωμή μπορεί να έχει ολοκληρωθεί, αλλά δεν μπορέσαμε να καταχωρήσουμε την παραγγελία. Επικοινωνήστε με το κατάστημα.",
    );
  }

  return data as { id: string; order_number: string };
}

export async function assertAdminAction() {
  await requireAdmin();
  return { ok: true as const };
}
