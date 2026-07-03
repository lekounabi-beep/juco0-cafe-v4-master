/**
 * DB-backed auth rate limiting — survives serverless cold starts.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { serverLog } from "./logger";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

type LockoutRow = {
  id: string;
  failed_count: number;
  first_failure_at: string | null;
  locked_until: string | null;
};

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

function lockoutId(scope: string, identifier: string): string {
  return `${scope}:${identifier}`;
}

export async function checkRateLimit(
  scope: "admin" | "driver",
  identifier: string,
): Promise<RateLimitResult> {
  const id = lockoutId(scope, identifier);
  const now = Date.now();

  const { data } = await supabaseAdmin
    .from("auth_lockouts" as never)
    .select("id, failed_count, first_failure_at, locked_until")
    .eq("id", id)
    .maybeSingle();

  const row = data as LockoutRow | null;

  if (row?.locked_until) {
    const lockedUntilMs = new Date(row.locked_until).getTime();
    if (lockedUntilMs > now) {
      return {
        allowed: false,
        retryAfterSec: Math.ceil((lockedUntilMs - now) / 1000),
      };
    }
  }

  if (row?.first_failure_at) {
    const windowStart = new Date(row.first_failure_at).getTime();
    if (now - windowStart > WINDOW_MS) {
      await supabaseAdmin
        .from("auth_lockouts" as never)
        .delete()
        .eq("id", id);
    } else if (row.failed_count >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(now + LOCKOUT_MS).toISOString();
      await supabaseAdmin
        .from("auth_lockouts" as never)
        .update({ locked_until: lockedUntil } as never)
        .eq("id", id);
      serverLog.warn("auth.rate_limit.locked", { scope, identifier });
      return { allowed: false, retryAfterSec: Math.ceil(LOCKOUT_MS / 1000) };
    }
  }

  return { allowed: true };
}

export async function recordFailedAttempt(
  scope: "admin" | "driver",
  identifier: string,
): Promise<void> {
  const id = lockoutId(scope, identifier);
  const now = new Date().toISOString();
  const nowMs = Date.now();

  const { data } = await supabaseAdmin
    .from("auth_lockouts" as never)
    .select("id, failed_count, first_failure_at, locked_until")
    .eq("id", id)
    .maybeSingle();

  const row = data as LockoutRow | null;

  if (!row) {
    await supabaseAdmin.from("auth_lockouts" as never).insert({
      id,
      failed_count: 1,
      first_failure_at: now,
      locked_until: null,
    } as never);
    return;
  }

  const windowStart = row.first_failure_at ? new Date(row.first_failure_at).getTime() : nowMs;
  const inWindow = nowMs - windowStart <= WINDOW_MS;
  const nextCount = inWindow ? row.failed_count + 1 : 1;

  const update: Record<string, unknown> = {
    failed_count: nextCount,
    first_failure_at: inWindow ? row.first_failure_at : now,
    locked_until: null,
  };

  if (nextCount >= MAX_ATTEMPTS) {
    update.locked_until = new Date(nowMs + LOCKOUT_MS).toISOString();
    serverLog.warn("auth.rate_limit.locked", { scope, identifier });
  }

  await supabaseAdmin
    .from("auth_lockouts" as never)
    .update(update as never)
    .eq("id", id);
}

export async function clearRateLimit(scope: "admin" | "driver", identifier: string): Promise<void> {
  const id = lockoutId(scope, identifier);
  await supabaseAdmin
    .from("auth_lockouts" as never)
    .delete()
    .eq("id", id);
}

export async function resolveClientIdentifier(): Promise<string> {
  const { headers } = await import("next/headers");
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerStore.get("x-real-ip") || "unknown";
}
