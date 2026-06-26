"use server";

import { cookies, headers } from "next/headers";
import { ADMIN_AUTH_COOKIE } from "@/lib/auth/admin-session";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function getExpectedCredentials() {
  return {
    username: process.env.ADMIN_USERNAME ?? "Admin",
    password: process.env.ADMIN_PASSWORD ?? "123456789",
  };
}

async function resolveCookieSecure(): Promise<boolean> {
  if (process.env.ADMIN_COOKIE_SECURE === "true") return true;
  if (process.env.ADMIN_COOKIE_SECURE === "false") return false;

  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }

  // Local dev (next dev) — never require Secure on plain HTTP localhost
  return false;
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
  const expected = getExpectedCredentials();

  if (username !== expected.username || password !== expected.password) {
    return { ok: false, error: "Wrong credentials" };
  }

  const secure = await resolveCookieSecure();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_AUTH_COOKIE, "1", adminCookieOptions(secure));

  return { ok: true };
}

export async function adminLogout(): Promise<void> {
  const secure = await resolveCookieSecure();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_AUTH_COOKIE, "", {
    ...adminCookieOptions(secure),
    maxAge: 0,
  });
}

/** Client-safe check — used by AdminGuard before rendering protected routes. */
export async function verifyAdminCookie(): Promise<boolean> {
  try {
    await requireAdminCookie();
    return true;
  } catch {
    return false;
  }
}

export async function requireAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_AUTH_COOKIE)?.value;

  if (value !== "1") {
    throw new Error("Unauthorized");
  }
}
