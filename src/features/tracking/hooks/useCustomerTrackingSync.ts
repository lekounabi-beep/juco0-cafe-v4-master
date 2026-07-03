/**
 * Customer track page sync — server-authoritative polling + optional Realtime wake-up.
 *
 * After Phase 1.5, anon cannot SELECT orders or receive postgres_changes on orders.
 * Polling via getOrderForTrackingServer (service role + order_access cookie) is reliable.
 *
 * @deprecated Use useTrackingSession when NEXT_PUBLIC_TRACKING_SESSION=true.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrderForTrackingServer } from "@app/actions/order-tracking";
import {
  getAssignmentForTrackingServer,
  getDriverForTrackingServer,
} from "@app/actions/tracking-delivery";
import { useRealtimeOrder } from "@/integrations/supabase/hooks/useRealtimeOrders";
import { playNotificationSound } from "@/features/notifications/services/notification-sound.service";
import { isTerminalOrder } from "@/features/tracking/core/terminal-order";

const POLL_INTERVAL_MS = 3_000;
const REALTIME_DEBOUNCE_MS = 300;

export type TrackingOrder = {
  id: string;
  order_number: string;
  status: string;
  delivery_status: string;
  driver_id: string | null;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  address: string;
  address_notes?: string;
  customer_phone: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  lat?: number | null;
  lng?: number | null;
  coords?: { lat: number; lng: number };
};

export type TrackingDriver = {
  id: string;
  full_name: string;
  vehicle_type: string;
  phone: string;
  availability_status: string;
};

export type TrackingAssignment = {
  id: string;
  order_id: string;
  driver_id: string;
  assigned_at: string;
  accepted_at?: string | null;
  picked_up_at?: string | null;
  started_delivery_at?: string | null;
  arrived_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
};

function assignmentMilestoneReached(
  prev: TrackingAssignment | null,
  next: TrackingAssignment,
): boolean {
  return (
    (!prev?.picked_up_at && !!next.picked_up_at) ||
    (!prev?.started_delivery_at && !!next.started_delivery_at) ||
    (!prev?.arrived_at && !!next.arrived_at) ||
    (!prev?.delivered_at && !!next.delivered_at)
  );
}

type UseCustomerTrackingSyncResult = {
  order: TrackingOrder | null;
  driver: TrackingDriver | null;
  delivery: TrackingAssignment | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useCustomerTrackingSync(orderId: string): UseCustomerTrackingSyncResult {
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [driver, setDriver] = useState<TrackingDriver | null>(null);
  const [delivery, setDelivery] = useState<TrackingAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const deliveryRef = useRef<TrackingAssignment | null>(null);
  deliveryRef.current = delivery;

  const pollTimerRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadInFlightRef = useRef(false);
  const terminalRef = useRef(false);

  const syncRelated = useCallback(
    async (nextOrder: TrackingOrder, playMilestoneSound: boolean) => {
      if (!nextOrder.driver_id) {
        setDelivery(null);
        setDriver(null);
        return;
      }

      const [assignmentRow, driverRow] = await Promise.all([
        getAssignmentForTrackingServer(orderId),
        getDriverForTrackingServer(orderId, nextOrder.driver_id),
      ]);

      if (assignmentRow) {
        const prev = deliveryRef.current;
        const next = assignmentRow as TrackingAssignment;
        setDelivery(next);

        if (playMilestoneSound && assignmentMilestoneReached(prev, next)) {
          void playNotificationSound("delivery", {
            eventId: `${next.id}-${next.picked_up_at ?? ""}-${next.started_delivery_at ?? ""}-${next.arrived_at ?? ""}-${next.delivered_at ?? ""}`,
            orderId,
          });
        }
      }

      if (driverRow) {
        setDriver(driverRow as TrackingDriver);
      }
    },
    [orderId],
  );

  const loadTracking = useCallback(
    async (options?: { playMilestoneSound?: boolean; silent?: boolean }) => {
      if (!orderId || loadInFlightRef.current || terminalRef.current) return;
      loadInFlightRef.current = true;

      try {
        const row = await getOrderForTrackingServer(orderId);

        if (!row) {
          if (!options?.silent) {
            setError("Order not found");
          }
          return;
        }

        const nextOrder = row as TrackingOrder;
        setOrder(nextOrder);
        setError(null);

        if (isTerminalOrder(nextOrder)) {
          terminalRef.current = true;
        }

        await syncRelated(nextOrder, options?.playMilestoneSound ?? false);
      } catch {
        if (!options?.silent) {
          setError("Failed to load order");
        }
      } finally {
        loadInFlightRef.current = false;
        setLoading(false);
      }
    },
    [orderId, syncRelated],
  );

  const scheduleDebouncedLoad = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      void loadTracking({ playMilestoneSound: true, silent: true });
    }, REALTIME_DEBOUNCE_MS);
  }, [loadTracking]);

  const refresh = useCallback(async () => {
    terminalRef.current = false;
    await loadTracking({ playMilestoneSound: false });
  }, [loadTracking]);

  useEffect(() => {
    terminalRef.current = false;
    setLoading(true);
    setError(null);
    setOrder(null);
    setDriver(null);
    setDelivery(null);

    void loadTracking({ playMilestoneSound: false });

    pollTimerRef.current = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (terminalRef.current) return;
      void loadTracking({ playMilestoneSound: true, silent: true });
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible" && !terminalRef.current) {
        void loadTracking({ playMilestoneSound: true, silent: true });
      }
    };

    const onOnline = () => {
      if (!terminalRef.current) {
        void loadTracking({ playMilestoneSound: true, silent: true });
      }
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
  }, [orderId, loadTracking]);

  // Realtime wake-up when RLS/client allows postgres_changes (no-op after Phase 1.5).
  useRealtimeOrder(orderId, (payload) => {
    if (payload.eventType === "UPDATE") {
      scheduleDebouncedLoad();
    }
  });

  return { order, driver, delivery, loading, error, refresh };
}
