"use server";

import { cookies, headers } from "next/headers";

import { createSignedSessionToken, verifySignedSessionToken } from "@/lib/auth/signed-session";

import { ADMIN_AUTH_COOKIE } from "@/lib/auth/admin-session";

import { getAdminCredentials } from "@/lib/server/env";

import { serverLog } from "@/lib/server/logger";

import { revokeSessionSid, isSessionSidRevoked } from "@/lib/server/session-revocation.server";

import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  resolveClientIdentifier,
} from "@/lib/server/rate-limit.server";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

async function resolveCookieSecure(): Promise<boolean> {
  if (process.env.ADMIN_COOKIE_SECURE === "true") return true;

  if (process.env.ADMIN_COOKIE_SECURE === "false") return false;

  const headerStore = await headers();

  const forwardedProto = headerStore.get("x-forwarded-proto");

  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }

  return process.env.NODE_ENV === "production";
}

function adminCookieOptions(secure: boolean) {
  return {
    httpOnly: true,

    secure,

    sameSite: "lax" as const,

    path: "/",

    maxAge: COOKIE_MAX_AGE_SEC,
  };
}

export async function adminLogin(
  username: string,

  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const clientIp = await resolveClientIdentifier();

  const rateLimitKey = `${clientIp}:${username.trim().toLowerCase()}`;

  const limit = await checkRateLimit("admin", rateLimitKey);

  if (!limit.allowed) {
    serverLog.warn("admin.login.rate_limited", { username, clientIp });

    return { ok: false, error: "Too many attempts. Try again later." };
  }

  const expected = getAdminCredentials();

  if (username !== expected.username || password !== expected.password) {
    await recordFailedAttempt("admin", rateLimitKey);

    serverLog.warn("admin.login.failed", { username });

    return { ok: false, error: "Wrong credentials" };
  }

  await clearRateLimit("admin", rateLimitKey);

  const token = createSignedSessionToken("admin", username);

  const secure = await resolveCookieSecure();

  const cookieStore = await cookies();

  cookieStore.set(ADMIN_AUTH_COOKIE, token, adminCookieOptions(secure));

  serverLog.info("admin.login.success", { username });

  return { ok: true };
}

export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies();

  const token = cookieStore.get(ADMIN_AUTH_COOKIE)?.value;

  const payload = verifySignedSessionToken(token, "admin");

  if (payload?.sid) {
    await revokeSessionSid(payload.sid, "admin");
  }

  const secure = await resolveCookieSecure();

  cookieStore.set(ADMIN_AUTH_COOKIE, "", {
    ...adminCookieOptions(secure),

    maxAge: 0,
  });

  serverLog.info("admin.logout", {});
}

export async function verifyAdminCookie(): Promise<boolean> {
  try {
    await requireAdminSession();

    return true;
  } catch {
    return false;
  }
}

export async function requireAdminSession(): Promise<{ username: string }> {
  const cookieStore = await cookies();

  const token = cookieStore.get(ADMIN_AUTH_COOKIE)?.value;

  const payload = verifySignedSessionToken(token, "admin");

  if (!payload) {
    throw new Error("Unauthorized");
  }

  if (await isSessionSidRevoked(payload.sid)) {
    throw new Error("Unauthorized");
  }

  return { username: payload.sub };
}

/** @deprecated Use requireAdminSession */

export async function requireAdminCookie(): Promise<void> {
  await requireAdminSession();
}
