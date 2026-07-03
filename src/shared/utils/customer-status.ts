/**
 * Customer-facing order status types and step derivation.
 * Canonical delivery state lives in computeDeliveryState / useDeliveryState.
 */

import { computeDeliveryState } from "@/features/delivery/core/compute-delivery-state";

export type CustomerOrderStep = "received" | "preparing" | "on_the_way" | "delivered" | "cancelled";

/** @deprecated Prefer computeDeliveryState or useDeliveryState */
export function getCustomerOrderStep(
  orderStatus?: string,
  deliveryStatus?: string,
): CustomerOrderStep {
  return computeDeliveryState({
    order: { status: orderStatus, delivery_status: deliveryStatus },
    locations: [],
  }).customerStep;
}
