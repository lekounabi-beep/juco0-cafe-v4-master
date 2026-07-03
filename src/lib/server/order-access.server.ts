/**
 * Signed order-view access — grants full tracking PII after checkout redirect.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isUUID } from "@/shared/utils/uuid";
import { getSessionSecret } from "./env";

export const ORDER_ACCESS_COOKIE = "order_access";

type OrderAccessPayload = {
  orderId: string;
  exp: number;
};

const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function sign(body: string): string {
  return createHmac("sha256", getSessionSecret()).update(`order:${body}`).digest("base64url");
}

function encode(payload: OrderAccessPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decode(body: string): OrderAccessPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as OrderAccessPayload;
    if (!parsed.orderId || !parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createOrderAccessToken(orderId: string): string {
  const payload: OrderAccessPayload = {
    orderId,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const body = encode(payload);
  return `${body}.${sign(body)}`;
}

export function verifyOrderAccessToken(token: string | null | undefined, orderId: string): boolean {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [body, sig] = parts;
  const expected = sign(body);

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  const payload = decode(body);
  if (!payload) return false;
  if (payload.orderId !== orderId) return false;
  if (payload.exp < Math.floor(Date.now() / 1000)) return false;

  return true;
}

export async function setOrderAccessCookie(orderId: string): Promise<void> {
  const token = createOrderAccessToken(orderId);
  const cookieStore = await cookies();
  cookieStore.set(ORDER_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function hasOrderAccess(orderId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ORDER_ACCESS_COOKIE)?.value;
  return verifyOrderAccessToken(token, orderId);
}

/**
 * Track-page access: valid order UUID in the URL is the capability token (Wolt-style link).
 * Sets order_access cookie on first successful visit so assignment/GPS/actions work in follow-up calls.
 */
export async function resolveOrderTrackingAccess(orderId: string): Promise<boolean> {
  if (!isUUID(orderId)) return false;
  if (await hasOrderAccess(orderId)) return true;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) return false;

  await setOrderAccessCookie(orderId);
  return true;
}

/** Public-safe order fields returned without order-access cookie. */
export const PUBLIC_TRACKING_FIELDS = [
  "id",
  "order_number",
  "status",
  "delivery_status",
  "driver_id",
  "items",
  "subtotal",
  "delivery_fee",
  "total",
  "payment_method",
  "payment_status",
  "created_at",
] as const;

/** Full fields including PII — only when order access cookie is valid. */
export const FULL_TRACKING_FIELDS = [
  ...PUBLIC_TRACKING_FIELDS,
  "customer_name",
  "customer_phone",
  "address",
  "address_notes",
  "lat",
  "lng",
  "notes",
] as const;

export function redactOrderForPublicTracking<T extends Record<string, unknown>>(
  order: T,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const key of PUBLIC_TRACKING_FIELDS) {
    if (key in order) safe[key] = order[key];
  }
  safe.address = "";
  safe.customer_phone = "";
  safe.address_notes = null;
  safe.lat = null;
  safe.lng = null;
  safe.notes = null;
  safe.customer_name = order.customer_name ?? "";
  return safe;
}
