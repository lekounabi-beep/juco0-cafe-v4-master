/**
 * Viva webhook request helpers — IP resolution and optional allowlist.
 *
 * IP allowlist is opt-in via VIVA_WEBHOOK_IP_ALLOWLIST (comma-separated exact IPs).
 * CIDR ranges should be enforced at the firewall / CDN layer — see docs/PUBLIC_API_KEYS.md.
 */

import type { NextRequest } from "next/server";

export function resolveWebhookClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function isWebhookIpAllowed(clientIp: string): boolean {
  const raw = process.env.VIVA_WEBHOOK_IP_ALLOWLIST?.trim();
  if (!raw) {
    return true;
  }

  const allowed = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return allowed.includes(clientIp);
}
