/**
 * Realtime hook for order subscriptions
 */

import { useEffect, useRef, useCallback } from "react";
import { realtimeService, type RealtimeChangePayload } from "../services/realtime.service";

export function useRealtimeOrders(
  callback: (payload: RealtimeChangePayload) => void,
  filter?: { event?: "INSERT" | "UPDATE" | "DELETE"; filter?: string },
) {
  const subscriptionIdRef = useRef<string | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const filterKey = filter ? `${filter.event ?? "*"}:${filter.filter ?? ""}` : "*";

  useEffect(() => {
    subscriptionIdRef.current = realtimeService.subscribeToOrders(
      (payload) => callbackRef.current(payload),
      filter,
    );

    return () => {
      if (subscriptionIdRef.current) {
        realtimeService.unsubscribe(subscriptionIdRef.current);
      }
    };
  }, [filterKey]);

  const getConnectionState = useCallback(() => {
    return realtimeService.getConnectionState();
  }, []);

  return {
    connectionState: getConnectionState(),
  };
}

/**
 * Realtime hook for subscribing to a specific order
 */
export function useRealtimeOrder(
  orderId: string,
  callback: (payload: RealtimeChangePayload) => void,
) {
  const subscriptionIdRef = useRef<string | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!orderId) return;

    subscriptionIdRef.current = realtimeService.subscribeToOrder(orderId, (payload) =>
      callbackRef.current(payload),
    );

    return () => {
      if (subscriptionIdRef.current) {
        realtimeService.unsubscribe(subscriptionIdRef.current);
      }
    };
  }, [orderId]);

  const getConnectionState = useCallback(() => {
    return realtimeService.getConnectionState();
  }, []);

  return {
    connectionState: getConnectionState(),
  };
}
