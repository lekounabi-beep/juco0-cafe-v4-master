/**
 * Webhook rate limiting — shared Upstash Redis when configured, in-memory fallback otherwise.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { isProduction } from "@/lib/server/env";
import { serverLog } from "@/lib/server/logger";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();
let upstashRatelimit: Ratelimit | null | undefined;
let loggedMissingUpstash = false;

export type WebhookRateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

function hasUpstashConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

function getUpstashRatelimit(): Ratelimit | null {
  if (!hasUpstashConfig()) {
    if (isProduction() && !loggedMissingUpstash) {
      loggedMissingUpstash = true;
      serverLog.warn("payment.webhook.rate_limit.memory_fallback", {
        reason: "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set",
      });
    }
    return null;
  }

  if (upstashRatelimit === undefined) {
    upstashRatelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS_PER_WINDOW, "60 s"),
      prefix: "juco:webhook",
      analytics: true,
    });
  }

  return upstashRatelimit;
}

function checkWebhookRateLimitInMemory(clientIp: string): WebhookRateLimitResult {
  const key = clientIp.trim() || "unknown";
  const now = Date.now();
  const bucket = memoryBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

export async function checkWebhookRateLimit(clientIp: string): Promise<WebhookRateLimitResult> {
  const key = clientIp.trim() || "unknown";
  const upstash = getUpstashRatelimit();

  if (!upstash) {
    return checkWebhookRateLimitInMemory(key);
  }

  try {
    const result = await upstash.limit(key);

    if (!result.success) {
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
      };
    }

    return { allowed: true };
  } catch (error) {
    serverLog.error("payment.webhook.rate_limit.upstash_error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return checkWebhookRateLimitInMemory(key);
  }
}
