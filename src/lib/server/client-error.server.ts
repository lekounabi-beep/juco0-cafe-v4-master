/**
 * Sanitize errors returned to clients — never leak Postgres/SQL internals.
 */

import { serverLog } from "./logger";

const GENERIC_ERROR = "Something went wrong. Please try again.";

export function toClientError(
  error: unknown,
  context: string,
  fallback: string = GENERIC_ERROR,
): string {
  const detail = error instanceof Error ? error.message : String(error);
  serverLog.error("client.error", { context, detail });
  return fallback;
}

export function toClientActionError(
  error: unknown,
  context: string,
): { success: false; error: string } {
  return { success: false, error: toClientError(error, context) };
}
