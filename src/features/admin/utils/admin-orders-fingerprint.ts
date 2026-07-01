import type { AdminOrder } from "@/features/admin/types/admin-order.types";

/** Stable fingerprint for detecting meaningful order list changes without deep compare. */
export function adminOrdersFingerprint(orders: AdminOrder[]): string {
  if (orders.length === 0) return "";

  return orders
    .map(
      (order) =>
        `${order.id}:${order.status}:${order.delivery_status}:${order.driver_id ?? ""}:${order.payment_status}`,
    )
    .join("|");
}
