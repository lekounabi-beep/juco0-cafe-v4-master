/**
 * Expire abandoned card checkouts — pending orders never paid within timeout.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { serverLog } from "@/lib/server/logger";

const DEFAULT_ABANDONED_MINUTES = Number(process.env.CARD_PAYMENT_ABANDONED_MINUTES ?? 45);

export async function expireAbandonedCardPaymentOrders(
  abandonedMinutes: number = DEFAULT_ABANDONED_MINUTES,
): Promise<number> {
  const cutoff = new Date(Date.now() - abandonedMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ payment_status: "cancelled" } as never)
    .eq("payment_method", "card")
    .eq("payment_status", "pending")
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    serverLog.error("payment.failed", {
      step: "abandoned_cleanup",
      error: error.message,
    });
    return 0;
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    serverLog.info("payment.abandoned.expired", { count, abandonedMinutes });
  }

  return count;
}
