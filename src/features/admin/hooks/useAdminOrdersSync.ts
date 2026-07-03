/**

 * Admin dashboard order sync — server-authoritative polling + optional Realtime wake-up.

 *

 * Supabase postgres_changes on `orders` uses the browser anon client; after Phase 1.5

 * anon cannot SELECT orders, so Realtime INSERT events typically do not arrive.

 * Polling via getAllOrdersForAdmin (service role + admin session) is the reliable path.

 */

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { getAllOrdersForAdmin } from "@app/actions/admin-orders";

import type { AdminOrder } from "@/features/admin/types/admin-order.types";

import { adminOrdersFingerprint } from "@/features/admin/utils/admin-orders-fingerprint";

import { useRealtimeOrders } from "@/integrations/supabase/hooks/useRealtimeOrders";

import { playNotificationSound } from "@/features/notifications/services/notification-sound.service";

import { realtimeNotificationKeys } from "@/features/notifications/utils/realtime-notification-keys";

export const ADMIN_ORDERS_POLL_INTERVAL_MS = 6_000;

const REALTIME_DEBOUNCE_MS = 300;

type UseAdminOrdersSyncResult = {
  orders: AdminOrder[];

  /** True only until the first load completes — background polls do not toggle this. */

  loading: boolean;

  refresh: () => Promise<void>;
};

export function useAdminOrdersSync(): UseAdminOrdersSyncResult {
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  const [loading, setLoading] = useState(true);

  const knownOrderIdsRef = useRef<Set<string>>(new Set());

  const pollTimerRef = useRef<number | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadInFlightRef = useRef(false);

  const hasLoadedOnceRef = useRef(false);

  const lastFingerprintRef = useRef<string | null>(null);

  const applyOrders = useCallback((nextOrders: AdminOrder[], playSoundForNew: boolean) => {
    const fingerprint = adminOrdersFingerprint(nextOrders);

    const isFirstLoad = !hasLoadedOnceRef.current;

    if (!isFirstLoad && lastFingerprintRef.current === fingerprint) {
      return;
    }

    lastFingerprintRef.current = fingerprint;

    const nextIds = new Set(nextOrders.map((o) => o.id));

    if (playSoundForNew && knownOrderIdsRef.current.size > 0) {
      const hasNew = nextOrders.some((o) => !knownOrderIdsRef.current.has(o.id));

      if (hasNew) {
        void playNotificationSound("order");
      }
    }

    knownOrderIdsRef.current = nextIds;

    setOrders(nextOrders);
  }, []);

  const loadOrders = useCallback(
    async (options?: { playSoundForNew?: boolean; silent?: boolean }) => {
      if (loadInFlightRef.current) return;

      loadInFlightRef.current = true;

      try {
        const result = await getAllOrdersForAdmin();

        if (!result.success) {
          console.error("[Admin] Failed to load orders:", result.error);

          if (result.error.includes("Unauthorized")) {
            toast.error(result.error);
          }

          if (!options?.silent && !hasLoadedOnceRef.current) {
            setOrders([]);
          }

          return;
        }

        applyOrders(result.orders, options?.playSoundForNew ?? !options?.silent);
      } catch (error) {
        console.error("[Admin] Failed to load orders:", error);

        if (!options?.silent && !hasLoadedOnceRef.current) {
          toast.error(error instanceof Error ? error.message : "Failed to load orders");
        }
      } finally {
        loadInFlightRef.current = false;

        if (!hasLoadedOnceRef.current) {
          hasLoadedOnceRef.current = true;

          setLoading(false);
        }
      }
    },

    [applyOrders],
  );

  const scheduleDebouncedLoad = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void loadOrders({ playSoundForNew: true, silent: true });
    }, REALTIME_DEBOUNCE_MS);
  }, [loadOrders]);

  const refresh = useCallback(async () => {
    await loadOrders({ playSoundForNew: false, silent: true });
  }, [loadOrders]);

  useEffect(() => {
    void loadOrders({ playSoundForNew: false });

    pollTimerRef.current = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      void loadOrders({ playSoundForNew: true, silent: true });
    }, ADMIN_ORDERS_POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadOrders({ playSoundForNew: true, silent: true });
      }
    };

    const onOnline = () => {
      void loadOrders({ playSoundForNew: true, silent: true });
    };

    document.addEventListener("visibilitychange", onVisible);

    window.addEventListener("online", onOnline);

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);

        pollTimerRef.current = null;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);

        debounceTimerRef.current = null;
      }

      document.removeEventListener("visibilitychange", onVisible);

      window.removeEventListener("online", onOnline);
    };
  }, [loadOrders]);

  // Realtime wake-up when RLS/client allows postgres_changes (no-op otherwise).

  useRealtimeOrders((payload) => {
    if (payload.eventType === "INSERT") {
      void playNotificationSound("order", realtimeNotificationKeys(payload));
    }

    scheduleDebouncedLoad();
  });

  return { orders, loading, refresh };
}
