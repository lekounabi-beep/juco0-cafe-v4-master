/**
 * Kitchen order workflow validation — admin transitions run via server action.
 * Delivery progress lives in delivery_assignments via atomic RPCs.
 */

import type { OrderStatus } from "../types/delivery.types";

const KITCHEN_ORDER_STATUSES = ["pending", "accepted", "preparing", "ready"] as const;

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted"],
  accepted: ["preparing", "ready"],
  preparing: ["ready"],
  ready: [],
  assigned: [],
  picked_up: [],
  in_transit: [],
  arrived: [],
  delivered: [],
  cancelled: [],
};

/**
 * Validate if an order status transition is valid (kitchen states only).
 */
export function validateOrderStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
): { valid: boolean; reason?: string } {
  if (
    !KITCHEN_ORDER_STATUSES.includes(currentStatus as (typeof KITCHEN_ORDER_STATUSES)[number]) ||
    !KITCHEN_ORDER_STATUSES.includes(newStatus as (typeof KITCHEN_ORDER_STATUSES)[number])
  ) {
    return {
      valid: false,
      reason: `orders.status is kitchen-only. Use delivery_assignments via transition_delivery_atomic for ${newStatus}.`,
    };
  }

  const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}. Valid transitions: ${allowedTransitions.join(", ")}`,
    };
  }

  return { valid: true };
}
