import { NextRequest, NextResponse } from "next/server";
import { completeVivaOrderByOrderCode } from "@/lib/server/complete-viva-order.server";
import { serverLog } from "@/lib/server/logger";
import { isProduction } from "@/lib/server/env";

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

/** Viva payment webhook — authoritative order creation (browser redirect is UX-only). */
export async function POST(request: NextRequest) {
  try {
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

    const eventTypeId = body.EventTypeId;
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
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
