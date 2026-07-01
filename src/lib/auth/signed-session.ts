/**
 * HMAC-signed session tokens for admin and driver HttpOnly cookies.
 * Server-only — do not import from client components.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { getSessionSecret } from "@/lib/server/env";

export type SessionKind = "admin" | "driver";

export type SignedSessionPayload = {
  sub: string;
  kind: SessionKind;
  exp: number;
  /** Monotonic session version — incremented on logout invalidates old tokens server-side via min version check optional */
  sid: string;
};

const ADMIN_MAX_AGE_SEC = 60 * 60 * 24 * 7;
const DRIVER_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function signBody(body: string): string {
  return createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
}

function encodePayload(payload: SignedSessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(body: string): SignedSessionPayload | null {
  try {
    const json = Buffer.from(body, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as SignedSessionPayload;
    if (!parsed.sub || !parsed.kind || !parsed.exp || !parsed.sid) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createSignedSessionToken(
  kind: SessionKind,
  subject: string,
  maxAgeSec: number = kind === "admin" ? ADMIN_MAX_AGE_SEC : DRIVER_MAX_AGE_SEC,
): string {
  const payload: SignedSessionPayload = {
    sub: subject,
    kind,
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
    sid: crypto.randomUUID(),
  };
  const body = encodePayload(payload);
  const sig = signBody(body);
  return `${body}.${sig}`;
}

export function verifySignedSessionToken(
  token: string | undefined | null,
  expectedKind: SessionKind,
): SignedSessionPayload | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, sig] = parts;
  const expectedSig = signBody(body);

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const payload = decodePayload(body);
  if (!payload) return null;
  if (payload.kind !== expectedKind) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

/** Edge-compatible verification for middleware (Web Crypto). */
export async function verifySignedSessionTokenEdge(
  token: string | undefined | null,
  expectedKind: SessionKind,
): Promise<SignedSessionPayload | null> {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, sig] = parts;
  const secret = getSessionSecret();

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expectedSig = Buffer.from(signature).toString("base64url");

  if (sig.length !== expectedSig.length) return null;

  let match = true;
  for (let i = 0; i < sig.length; i++) {
    if (sig.charCodeAt(i) !== expectedSig.charCodeAt(i)) match = false;
  }
  if (!match) return null;

  const payload = decodePayload(body);
  if (!payload) return null;
  if (payload.kind !== expectedKind) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}
