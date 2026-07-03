import { NextRequest, NextResponse } from "next/server";
import { completeVivaOrderByOrderCode } from "@/lib/server/complete-viva-order.server";
import { serverLog } from "@/lib/server/logger";
import { captureException } from "@/lib/server/monitoring.server";
import { isProduction } from "@/lib/server/env";
import { checkWebhookRateLimit } from "@/lib/server/webhook-rate-limit.server";
import { isWebhookIpAllowed, resolveWebhookClientIp } from "@/lib/server/webhook-request.server";

const TRANSACTION_PAYMENT_CREATED = 1796;

function getWebhookKey(): string | null {
  return process.env.VIVA_WEBHOOK_KEY ?? null;
}

/** Viva webhook verification — GET returns the verification key. */
export async function GET() {
  const key = getWebhookKey();
  if (!key) {
    serverLog.warn("payment.webhook.no_key", {});
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  return NextResponse.json({ Key: key });
}

type VivaWebhookPayload = {
  EventTypeId?: number;
  OrderCode?: number | string;
  TransactionId?: string;
  StatusId?: string;
  Amount?: number;
};

function parseOrderCode(raw: number | string | undefined): string | null {
  if (raw == null) return null;
  const code = String(raw).trim();
  return code.length > 0 ? code : null;
}

function parseTransactionId(raw: string | undefined): string | null {
  if (!raw) return null;
  const id = raw.trim();
  return id.length > 0 ? id : null;
}

async function enforceWebhookGuards(request: NextRequest): Promise<NextResponse | null> {
  const clientIp = resolveWebhookClientIp(request);

  const rateLimit = await checkWebhookRateLimit(clientIp);
  if (!rateLimit.allowed) {
    serverLog.warn("payment.webhook.rate_limited", { clientIp });
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSec) },
      },
    );
  }

  if (isProduction() && !isWebhookIpAllowed(clientIp)) {
    serverLog.warn("payment.webhook.ip_rejected", { clientIp });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    serverLog.warn("payment.webhook.invalid_content_type", { clientIp, contentType });
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  return null;
}

/**
 * Viva payment webhook — authoritative order completion (browser redirect is UX-only).
 *
 * Signature headers (Viva-Signature / Viva-Signature-256) apply to file-export webhooks,
 * not Transaction Payment Created. Payment authenticity is verified server-side via
 * Viva Retrieve Transaction API inside completeVivaOrderByOrderCode.
 *
 * TODO: Re-evaluate HMAC verification if Viva documents signatures for payment webhooks.
 * TODO: Enforce CIDR allowlist at firewall/CDN — see docs/PUBLIC_API_KEYS.md.
 * Multi-instance: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for shared rate limits.
 */
export async function POST(request: NextRequest) {
  try {
    const guardResponse = await enforceWebhookGuards(request);
    if (guardResponse) {
      return guardResponse;
    }

    if (isProduction() && !getWebhookKey()) {
      serverLog.error("payment.webhook.misconfigured", {});
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    let body: VivaWebhookPayload;
    try {
      body = (await request.json()) as VivaWebhookPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventTypeId = body.EventTypeId;
    if (typeof eventTypeId !== "number") {
      return NextResponse.json({ error: "Invalid EventTypeId" }, { status: 400 });
    }

    if (eventTypeId !== TRANSACTION_PAYMENT_CREATED) {
      serverLog.info("payment.webhook.ignored", { eventTypeId });
      return NextResponse.json({ ok: true, ignored: true });
    }

    const statusId = body.StatusId;
    if (statusId && statusId !== "F") {
      serverLog.info("payment.webhook.not_finished", { statusId, orderCode: body.OrderCode });
      return NextResponse.json({ ok: true, ignored: true });
    }

    const orderCode = parseOrderCode(body.OrderCode);
    const transactionId = parseTransactionId(body.TransactionId);

    if (!orderCode || !transactionId) {
      serverLog.warn("payment.webhook.missing_fields", {
        orderCode: body.OrderCode,
        transactionId: body.TransactionId,
      });
      return NextResponse.json({ error: "Missing OrderCode or TransactionId" }, { status: 400 });
    }

    serverLog.info("payment.webhook.received", { orderCode, transactionId });

    const result = await completeVivaOrderByOrderCode(orderCode, transactionId);

    if (!result) {
      serverLog.warn("payment.webhook.no_order_created", { orderCode, transactionId });
      return NextResponse.json({ ok: true, pending: true });
    }

    serverLog.info("payment.webhook.order_created", {
      orderId: result.id,
      orderNumber: result.order_number,
      transactionId,
    });

    return NextResponse.json({ ok: true, orderId: result.id });
  } catch (error) {
    serverLog.error("payment.webhook.error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    captureException(error, { event: "payment.webhook.error" });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
