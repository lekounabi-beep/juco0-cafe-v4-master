/**
 * Driver Realtime hook
 * Debounced updates — refreshes data only; UI derives from activeDeliveryView.
 */

import { useCallback, useEffect, useRef } from "react";
import { useRealtimeOrders } from "@/integrations/supabase/hooks/useRealtimeOrders";
import { playNotificationSound } from "@/features/notifications/services/notification-sound.service";
import { realtimeNotificationKeys } from "@/features/notifications/utils/realtime-notification-keys";
import { shouldSkipDriverRealtimeCallback } from "@/lib/network/driver-network";

const REALTIME_DEBOUNCE_MS = 300;

interface UseDriverRealtimeProps {
  onOrderUpdate: () => void;
}

export function useDriverRealtime({ onOrderUpdate }: UseDriverRealtimeProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onOrderUpdateRef = useRef(onOrderUpdate);
  onOrderUpdateRef.current = onOrderUpdate;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleUpdate = useCallback(() => {
    if (shouldSkipDriverRealtimeCallback()) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onOrderUpdateRef.current();
    }, REALTIME_DEBOUNCE_MS);
  }, []);

  useRealtimeOrders((payload) => {
    if (payload.eventType === "INSERT") {
      void playNotificationSound("order", realtimeNotificationKeys(payload));
    }
    handleUpdate();
  });
}
