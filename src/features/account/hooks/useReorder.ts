/**
 * Reorder hook - uses shared restore pipeline.
 */

"use client";

import { useRestoreOrder } from "./useRestoreOrder";
import type { Order } from "@/features/account/types/account.types";

export function useReorder() {
  const {
    restore,
    loading,
    pending,
    priceNotice,
    confirmContinueWithoutIssues,
    cancelPending,
    dismissPriceNotice,
    error,
  } = useRestoreOrder();

  const reorder = async (order: Order) => {
    return restore(order.items, { redirectToCheckout: true });
  };

  return {
    reorder,
    loading,
    pending,
    priceNotice,
    confirmContinueWithoutIssues,
    cancelPending,
    dismissPriceNotice,
    error,
  };
}
