/**
 * Structured server-side logging for critical security and business events.
 */

export type LogEvent =
  | "admin.login.success"
  | "admin.login.failed"
  | "admin.login.rate_limited"
  | "admin.logout"
  | "admin.menu.load_failed"
  | "admin.menu.hours_load_failed"
  | "admin.menu.info_load_failed"
  | "admin.menu.product_update_failed"
  | "admin.menu.product_insert_failed"
  | "admin.menu.hours_save_failed"
  | "admin.menu.info_save_failed"
  | "admin.menu.saved"
  | "driver.login.success"
  | "driver.login.failed"
  | "driver.login.rate_limited"
  | "driver.logout"
  | "driver.create.failed"
  | "driver.availability.failed"
  | "driver.gps.failed"
  | "driver.orders.fetch_failed"
  | "driver.orders.assignment_fetch_failed"
  | "driver.transition.failed"
  | "order.created"
  | "order.rejected"
  | "order.idempotent_hit"
  | "payment.initiated"
  | "payment.verified"
  | "payment.failed"
  | "payment.amount_mismatch"
  | "payment.webhook.no_key"
  | "payment.webhook.misconfigured"
  | "payment.webhook.ignored"
  | "payment.webhook.not_finished"
  | "payment.webhook.missing_fields"
  | "payment.webhook.received"
  | "payment.webhook.no_order_created"
  | "payment.webhook.order_created"
  | "payment.webhook.error"
  | "payment.webhook.rate_limited"
  | "payment.webhook.rate_limit.memory_fallback"
  | "payment.webhook.rate_limit.upstash_error"
  | "payment.webhook.ip_rejected"
  | "payment.webhook.invalid_content_type"
  | "payment.webhook.no_pending"
  | "payment.webhook.expired_pending"
  | "payment.reconcile.unverified_txn"
  | "payment.reconcile.token_failed"
  | "payment.reconcile.recovery"
  | "payment.return.resolved"
  | "payment.return.pending"
  | "payment.return.failed"
  | "payment.order.updated"
  | "payment.abandoned.expired"
  | "checkout.pending.store_failed"
  | "checkout.started"
  | "checkout.completed"
  | "payment.success"
  | "driver.delivered"
  | "supabase.config.missing"
  | "supabase.middleware.auth_error"
  | "profile.delete_failed"
  | "driver.assignment.accepted"
  | "driver.assignment.failed"
  | "tracking.access.denied"
  | "auth.rate_limit.locked"
  | "session.revoke.failed"
  | "session.revoked"
  | "session.revoke.check_failed"
  | "client.error"
  | "env.validation.failed";

type LogPayload = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", event: LogEvent, payload?: LogPayload) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...payload,
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const serverLog = {
  info: (event: LogEvent, payload?: LogPayload) => emit("info", event, payload),
  warn: (event: LogEvent, payload?: LogPayload) => emit("warn", event, payload),
  error: (event: LogEvent, payload?: LogPayload) => emit("error", event, payload),
};
