"use server";

import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createSignedSessionToken, verifySignedSessionToken } from "@/lib/auth/signed-session";
import { DRIVER_AUTH_COOKIE } from "@/lib/auth/driver-session";
import { serverLog } from "@/lib/server/logger";
import { isUUID } from "@/shared/utils/uuid";
import { revokeSessionSid, isSessionSidRevoked } from "@/lib/server/session-revocation.server";
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  resolveClientIdentifier,
} from "@/lib/server/rate-limit.server";
import type { DriverProfile } from "@/features/delivery/types/delivery.types";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

const DRIVER_PUBLIC_COLUMNS =
  "id, user_id, full_name, phone, email, vehicle_type, vehicle_plate, availability_status, current_location_lat, current_location_lng, last_location_update, total_deliveries, rating, is_active, created_at, updated_at, username";

type DriverRow = {
  id: string;
  full_name: string;
  username: string | null;
  password_hash: string | null;
  is_active: boolean;
};

async function resolveCookieSecure(): Promise<boolean> {
  if (process.env.DRIVER_COOKIE_SECURE === "true") return true;
  if (process.env.DRIVER_COOKIE_SECURE === "false") return false;

  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }

  return process.env.NODE_ENV === "production";
}

function driverCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE_SEC,
  };
}

async function setDriverSessionCookie(driverId: string): Promise<string> {
  const token = createSignedSessionToken("driver", driverId);
  const secure = await resolveCookieSecure();
  const cookieStore = await cookies();
  cookieStore.set(DRIVER_AUTH_COOKIE, token, driverCookieOptions(secure));
  return token;
}

async function verifyDriverPassword(row: DriverRow, password: string): Promise<boolean> {
  if (!row.password_hash) {
    return false;
  }
  return bcrypt.compare(password, row.password_hash);
}

async function assertDriverActive(driverId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("drivers" as never)
    .select("is_active")
    .eq("id", driverId)
    .maybeSingle();

  if (error || !data || !(data as { is_active: boolean }).is_active) {
    throw new Error("Unauthorized");
  }
}

export async function requireDriverSession(): Promise<{ driverId: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DRIVER_AUTH_COOKIE)?.value;
  const payload = verifySignedSessionToken(token, "driver");

  if (!payload || !isUUID(payload.sub)) {
    throw new Error("Unauthorized");
  }

  if (await isSessionSidRevoked(payload.sid)) {
    throw new Error("Unauthorized");
  }

  await assertDriverActive(payload.sub);

  return { driverId: payload.sub };
}

export async function authenticateDriver(
  username: string,
  password: string,
): Promise<
  | { status: "success"; id: string; full_name: string }
  | { status: "invalid" }
  | { status: "rate_limited"; retryAfterSec: number }
> {
  const normalizedUsername = username.trim();
  const clientIp = await resolveClientIdentifier();
  const rateLimitKey = `${clientIp}:${normalizedUsername.toLowerCase()}`;

  const limit = await checkRateLimit("driver", rateLimitKey);
  if (!limit.allowed) {
    serverLog.warn("driver.login.rate_limited", { username: normalizedUsername, clientIp });
    return { status: "rate_limited", retryAfterSec: limit.retryAfterSec };
  }

  if (!normalizedUsername || !password) {
    await recordFailedAttempt("driver", rateLimitKey);
    serverLog.warn("driver.login.failed", {
      username: normalizedUsername,
      reason: "missing_fields",
    });
    return { status: "invalid" };
  }

  const { data, error } = await supabaseAdmin
    .from("drivers" as never)
    .select("id, full_name, username, password_hash, is_active")
    .ilike("username", normalizedUsername)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    await recordFailedAttempt("driver", rateLimitKey);
    serverLog.warn("driver.login.failed", { username: normalizedUsername, reason: "not_found" });
    return { status: "invalid" };
  }

  const row = data as DriverRow;
  const valid = await verifyDriverPassword(row, password);

  if (!valid) {
    await recordFailedAttempt("driver", rateLimitKey);
    serverLog.warn("driver.login.failed", { username: normalizedUsername, reason: "bad_password" });
    return { status: "invalid" };
  }

  await clearRateLimit("driver", rateLimitKey);
  await setDriverSessionCookie(row.id);
  serverLog.info("driver.login.success", { driverId: row.id, username: row.username });

  return { status: "success", id: row.id, full_name: row.full_name };
}

export async function driverLogout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DRIVER_AUTH_COOKIE)?.value;
  const payload = verifySignedSessionToken(token, "driver");

  if (payload?.sid) {
    await revokeSessionSid(payload.sid, "driver");
  }

  const secure = await resolveCookieSecure();
  cookieStore.set(DRIVER_AUTH_COOKIE, "", {
    ...driverCookieOptions(secure),
    maxAge: 0,
  });
  serverLog.info("driver.logout", {});
}

export async function verifyDriverSession(): Promise<boolean> {
  try {
    await requireDriverSession();
    return true;
  } catch {
    return false;
  }
}

export async function getDriverProfileById(driverId: string): Promise<DriverProfile | null> {
  const session = await requireDriverSession();
  if (session.driverId !== driverId) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("drivers" as never)
    .select(DRIVER_PUBLIC_COLUMNS)
    .eq("id", driverId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as DriverProfile;
}
