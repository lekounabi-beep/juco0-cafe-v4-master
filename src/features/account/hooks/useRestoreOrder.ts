"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { restoreOrderToCart } from "../services/restore-order-to-cart";
import { toOrderLineSnapshots } from "../services/order-line-validation.service";
import type {
  OrderLineSnapshot,
  OrderLineValidationResult,
  RestoreOrderOptions,
} from "../types/order-restore.types";

type PendingRestore = {
  lines: OrderLineSnapshot[];
  result: OrderLineValidationResult;
  options?: RestoreOrderOptions;
};

export function useRestoreOrder() {
  const clear = useCart((s) => s.clear);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingRestore | null>(null);
  const [priceNotice, setPriceNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartActions = useMemo(() => ({ clear, add, setQty }), [clear, add, setQty]);

  const finishRedirect = useCallback(
    (options?: RestoreOrderOptions) => {
      if (options?.redirectToCheckout !== false) {
        router.push("/checkout");
      }
    },
    [router],
  );

  const applyRestore = useCallback(
    async (
      lines: OrderLineSnapshot[],
      options?: RestoreOrderOptions & {
        skipIssueCheck?: boolean;
        validation?: OrderLineValidationResult;
      },
    ) => {
      setLoading(true);
      setError(null);

      try {
        const outcome = await restoreOrderToCart(lines, cartActions, {
          skipIssueCheck: options?.skipIssueCheck,
          validation: options?.validation,
        });

        if (outcome.status === "needs_confirmation") {
          setPending({ lines, result: outcome.result, options });
          return { success: false as const, needsConfirmation: true as const };
        }

        if (outcome.status === "empty" || outcome.status === "error") {
          setError(outcome.message);
          return { success: false as const, message: outcome.message };
        }

        if (outcome.hasPriceChanges) {
          setPriceNotice(true);
        }

        finishRedirect(options);
        return { success: true as const, hasPriceChanges: outcome.hasPriceChanges };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Η επαναφορά απέτυχε";
        setError(message);
        return { success: false as const, message };
      } finally {
        setLoading(false);
      }
    },
    [cartActions, finishRedirect],
  );

  const restore = useCallback(
    async (
      items: Array<{
        name: string;
        price: number;
        qty: number;
        category?: string;
        image?: string;
      }>,
      options?: RestoreOrderOptions,
    ) => {
      return applyRestore(toOrderLineSnapshots(items), options);
    },
    [applyRestore],
  );

  const confirmContinueWithoutIssues = useCallback(async () => {
    if (!pending) return { success: false as const };

    const { lines, options } = pending;
    setPending(null);

    return applyRestore(lines, {
      ...options,
      skipIssueCheck: true,
      validation: {
        valid: pending.result.valid,
        issues: [],
        hasPriceChanges: pending.result.hasPriceChanges,
      },
    });
  }, [applyRestore, pending]);

  const cancelPending = useCallback(() => {
    setPending(null);
  }, []);

  const dismissPriceNotice = useCallback(() => {
    setPriceNotice(false);
  }, []);

  return {
    restore,
    loading,
    error,
    pending,
    priceNotice,
    confirmContinueWithoutIssues,
    cancelPending,
    dismissPriceNotice,
  };
}
