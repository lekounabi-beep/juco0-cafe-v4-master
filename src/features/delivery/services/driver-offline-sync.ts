/**
 * Offline queue sync for non-GPS driver actions.
 * Server actions are loaded dynamically so GPS-only flows never import app/actions.
 */

import { isUUID } from "@/shared/utils/uuid";
import { withAcceptTimeout } from "./safe-accept-order";
import type { DeliveryStatus, OrderStatus } from "../types/delivery.types";

function isAlreadyAtStatus(error: string | undefined, status: string): boolean {
  if (!error) return false;
  const normalized = error.toLowerCase();
  return normalized.includes(status.replace("_", " ")) || normalized.includes(status);
}

async function loadAssignmentActions() {
  return import("../../../../app/actions/create-delivery-assignment");
}

async function loadWorkflowActions() {
  return import("../../../../app/actions/driver-workflow");
}

export async function syncAcceptOrder(payload: Record<string, unknown>): Promise<boolean> {
  const orderId = payload.orderId as string;
  const driverId = payload.driverId as string;

  if (!isUUID(orderId) || !isUUID(driverId)) {
    return false;
  }

  const { driverAcceptOrder } = await loadAssignmentActions();
  const result = await withAcceptTimeout("syncAcceptOrder", driverAcceptOrder(orderId, driverId));

  if (result.success && result.assignment) return true;

  return false;
}

export async function syncDeliveryTransition(
  payload: Record<string, unknown>,
  deliveryStatus: DeliveryStatus,
  orderStatus: OrderStatus,
): Promise<boolean> {
  const assignmentId = payload.assignmentId as string;
  const orderId = payload.orderId as string;
  const driverId = payload.driverId as string;

  const { driverTransitionAtomic } = await loadWorkflowActions();

  const result = await driverTransitionAtomic(
    assignmentId,
    orderId,
    driverId,
    deliveryStatus as "picked_up" | "in_transit" | "arrived" | "delivered",
  );
  if (!result.success && !isAlreadyAtStatus(result.error, deliveryStatus)) {
    return false;
  }

  return true;
}
