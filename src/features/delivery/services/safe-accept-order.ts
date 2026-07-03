/**
 * Deterministic driver accept flow — timeout-safe, explicit result, no UI deadlocks.
 */

import { driverAcceptOrder } from "../../../../app/actions/create-delivery-assignment";
import { devLog } from "@/shared/utils/dev-log";
import { isUUID } from "@/shared/utils/uuid";
import { enqueue, isNetworkOnline } from "./offline-queue.service";
import type { OptimisticOrder } from "./driver-offline-state";

export const ACCEPT_FLOW_TIMEOUT_MS = 8_000;

export type AcceptResult =
  { ok: true; state: "success"; assignmentId: string } | { ok: false; reason: string };

export async function withAcceptTimeout<T>(
  label: string,
  promise: Promise<T>,
  ms: number = ACCEPT_FLOW_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Accept an order with guaranteed resolution within ACCEPT_FLOW_TIMEOUT_MS.
 * Never awaits offline sync — queued accepts return immediately.
 */
export async function safeAcceptOrder(
  orderId: string,
  driverId: string,
  orderSnapshot: OptimisticOrder,
): Promise<AcceptResult> {
  devLog.log("[ACCEPT_FLOW_START]", { orderId, driverId });

  if (!isUUID(orderId)) {
    const reason = "Invalid order_id: UUID required";
    devLog.log("[ACCEPT_RESULT]", { ok: false, reason });
    return { ok: false, reason };
  }

  if (!isUUID(driverId)) {
    const reason = "Invalid driver_id: UUID required (use drivers.id from profile)";
    devLog.log("[ACCEPT_RESULT]", { ok: false, reason });
    return { ok: false, reason };
  }

  if (!isNetworkOnline()) {
    devLog.log("[ACCEPT_BEFORE_API]", { mode: "offline_queue" });
    enqueue("ACCEPT_ORDER", { orderId, driverId, orderSnapshot });
    devLog.log("[ACCEPT_AFTER_API]", { mode: "offline_queue" });
    const result: AcceptResult = {
      ok: false,
      reason: "Offline — connect to accept orders",
    };
    devLog.log("[ACCEPT_RESULT]", result);
    return result;
  }

  try {
    devLog.log("[ACCEPT_BEFORE_API]", { mode: "driverAcceptOrder" });
    const apiResult = await withAcceptTimeout(
      "driverAcceptOrder",
      driverAcceptOrder(orderId, driverId),
    );
    devLog.log("[ACCEPT_AFTER_API]", apiResult);

    if (apiResult.success && apiResult.assignment) {
      const result: AcceptResult = {
        ok: true,
        state: "success",
        assignmentId: apiResult.assignment.id,
      };
      devLog.log("[ACCEPT_RESULT]", result);
      return result;
    }

    const result: AcceptResult = {
      ok: false,
      reason: apiResult.error || "Failed to accept order",
    };
    devLog.log("[ACCEPT_RESULT]", result);
    return result;
  } catch (err) {
    devLog.log("[ACCEPT_CATCH_ERROR]", err);
    const result: AcceptResult = {
      ok: false,
      reason: err instanceof Error ? err.message : "Failed to accept order",
    };
    devLog.log("[ACCEPT_RESULT]", result);
    return result;
  } finally {
    devLog.log("[ACCEPT_FINALLY]");
  }
}
