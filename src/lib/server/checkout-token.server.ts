/**
 * Signed checkout tokens — server-issued, bind pricing + idempotency for card/COD flows.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { PricedOrderLine } from "./pricing.server";
import { getSessionSecret } from "./env";

export type CheckoutTokenPayload = {
  sub: string;
  kind: "checkout";
  exp: number;
  sid: string;
  clientRequestId: string;
  items: PricedOrderLine[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  customer_name: string;
  customer_phone: string;
  address: string;
  address_notes: string | null;
  lat: number | null;
  lng: number | null;
  payment_method: string;
  notes: string | null;
  user_id: string | null;
  fulfillment: "pickup" | "delivery";
  vivaOrderCode?: string;
};

const CHECKOUT_MAX_AGE_SEC = 60 * 30;

function encodeCheckout(payload: CheckoutTokenPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCheckout(body: string): CheckoutTokenPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as CheckoutTokenPayload;
    if (parsed.kind !== "checkout" || !parsed.clientRequestId || !parsed.total) return null;
    return parsed;
  } catch {
    return null;
  }
}

function signCheckout(body: string): string {
  return createHmac("sha256", getSessionSecret()).update(`checkout:${body}`).digest("base64url");
}

export function issueCheckoutToken(
  data: Omit<CheckoutTokenPayload, "sub" | "kind" | "exp" | "sid">,
): string {
  const payload: CheckoutTokenPayload = {
    ...data,
    sub: data.clientRequestId,
    kind: "checkout",
    exp: Math.floor(Date.now() / 1000) + CHECKOUT_MAX_AGE_SEC,
    sid: crypto.randomUUID(),
  };
  const body = encodeCheckout(payload);
  const sig = signCheckout(body);
  return `${body}.${sig}`;
}

export function verifyCheckoutToken(token: string | null | undefined): CheckoutTokenPayload | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, sig] = parts;
  const expected = signCheckout(body);

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const payload = decodeCheckout(body);
  if (!payload) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

export function attachVivaOrderCodeToToken(token: string, vivaOrderCode: string): string {
  const payload = verifyCheckoutToken(token);
  if (!payload) throw new Error("Invalid checkout token");

  const { sub: _s, kind: _k, exp: _e, sid: _sid, ...rest } = payload;
  return issueCheckoutToken({
    ...rest,
    vivaOrderCode,
  });
}
