/**
 * Shared monitoring hooks — safe for client and server bundles.
 * Server instrumentation imports from here via monitoring.server.ts.
 */

import * as Sentry from "@sentry/nextjs";
import { sanitizeMonitoringContext } from "@/lib/sentry/shared-config";

type MonitoringContext = Record<string, unknown>;

let initialized = false;

function isSentryActive(): boolean {
  return Sentry.getClient() !== undefined;
}

export function initMonitoring(): void {
  if (initialized) return;
  initialized = true;
}

export function captureException(error: unknown, context?: MonitoringContext): void {
  if (process.env.NODE_ENV === "development") {
    console.error("[monitoring] captureException", error, context);
  }

  if (!isSentryActive()) return;

  const extra = sanitizeMonitoringContext(context);
  Sentry.captureException(error, extra ? { extra } : undefined);
}

export function captureMessage(message: string, context?: MonitoringContext): void {
  if (process.env.NODE_ENV === "development") {
    console.warn("[monitoring] captureMessage", message, context);
  }

  if (!isSentryActive()) return;

  const extra = sanitizeMonitoringContext(context);
  Sentry.captureMessage(message, {
    level: "warning",
    ...(extra ? { extra } : {}),
  });
}
