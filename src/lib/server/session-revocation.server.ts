/**
 * Server-side session revocation — stolen cookies fail after logout.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SessionKind } from "@/lib/auth/signed-session";
import { serverLog } from "./logger";

export async function revokeSessionSid(sid: string, kind: SessionKind): Promise<void> {
  if (!sid) return;

  const { error } = await supabaseAdmin
    .from("revoked_sessions" as never)
    .upsert({ sid, kind } as never, { onConflict: "sid" });

  if (error) {
    serverLog.error("session.revoke.failed", { sid, kind, error: error.message });
  } else {
    serverLog.info("session.revoked", { sid, kind });
  }
}

export async function isSessionSidRevoked(sid: string): Promise<boolean> {
  if (!sid) return true;

  const { data, error } = await supabaseAdmin
    .from("revoked_sessions" as never)
    .select("sid")
    .eq("sid", sid)
    .maybeSingle();

  if (error) {
    serverLog.error("session.revoke.check_failed", { sid, error: error.message });
    return false;
  }

  return data != null;
}
