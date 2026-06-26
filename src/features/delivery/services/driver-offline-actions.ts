/**
 * Driver actions — execute immediately when online; queue only as offline fallback.
 */

import { enqueue, isNetworkOnline, addOfflineGpsPoint } from "./offline-queue.service";
import { type OptimisticDelivery } from "./driver-offline-state";
import { driverTransitionAtomic } from "../../../../app/actions/driver-workflow";
import { recordDriverLocationSafe, localPositionFromGpsUpdate } from "./record-driver-location";
import type { DeliveryStatus, OrderStatus, GPSLocationUpdate } from "../types/delivery.types";
import type { OfflineActionType } from "./offline-queue.service";
import { withTimeout } from "@/shared/utils/with-timeout";

const TRANSITION_TIMEOUT_MS = 15_000;

export type TransitionResult = { ok: boolean; error?: string };

const ACTION_TO_STATUS: Record<
  string,
  { delivery: DeliveryStatus; order: OrderStatus; field?: keyof OptimisticDelivery }
> = {
  picked_up: { delivery: "picked_up", order: "picked_up", field: "picked_up_at" },
  start_delivery: { delivery: "in_transit", order: "in_transit", field: "started_delivery_at" },
  arrived: { delivery: "arrived", order: "arrived", field: "arrived_at" },
  delivered: { delivery: "delivered", order: "delivered", field: "delivered_at" },
};

const UI_ACTION_TO_QUEUE: Record<string, OfflineActionType> = {
  picked_up: "PICKED_UP",
  start_delivery: "IN_TRANSIT",
  arrived: "ARRIVED",
  delivered: "DELIVERED",
};

export async function runDeliveryTransitionWithOffline(
  action: string,
  assignmentId: string,
  orderId: string,
  driverId: string,
): Promise<TransitionResult> {
  const mapping = ACTION_TO_STATUS[action];
  const queueType = UI_ACTION_TO_QUEUE[action];
  if (!mapping || !queueType) return { ok: false, error: "unknown_action" };

  if (!isNetworkOnline()) {
    enqueue(queueType, { assignmentId, orderId, driverId });
    return { ok: false, error: "offline_queued" };
  }

  try {
    const result = await withTimeout(
      driverTransitionAtomic(
        assignmentId,
        orderId,
        driverId,
        mapping.delivery as "picked_up" | "in_transit" | "arrived" | "delivered",
      ),
      TRANSITION_TIMEOUT_MS,
      "transition_timeout",
    );

    if (!result.success) {
      return { ok: false, error: result.error ?? "transition_failed" };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "transition_failed";
    return { ok: false, error: message };
  }
}

export async function recordDriverLocationWithOffline(
  assignmentId: string,
  driverId: string,
  location: GPSLocationUpdate,
): Promise<{ success: boolean; localFallback: { lat: number; lng: number } | null }> {
  const localFallback = localPositionFromGpsUpdate(location);

  if (!isNetworkOnline()) {
    addOfflineGpsPoint(assignmentId, driverId, location);
    return { success: false, localFallback };
  }

  const result = await recordDriverLocationSafe(assignmentId, driverId, location);
  if (!result.success) {
    // gps-repository already buffers on failure — avoid duplicate offline points.
    return { success: false, localFallback };
  }

  return { success: true, localFallback: null };
}
