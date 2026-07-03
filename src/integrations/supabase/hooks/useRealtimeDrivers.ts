/**
 * Realtime hook for driver subscriptions
 */

import { useEffect, useRef, useCallback } from "react";
import { realtimeService, type RealtimeChangePayload } from "../services/realtime.service";

export function useRealtimeDrivers(
  callback: (payload: RealtimeChangePayload) => void,
  filter?: { event?: "INSERT" | "UPDATE" | "DELETE"; filter?: string },
) {
  const subscriptionIdRef = useRef<string | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const filterKey = filter ? `${filter.event ?? "*"}:${filter.filter ?? ""}` : "*";

  useEffect(() => {
    subscriptionIdRef.current = realtimeService.subscribeToDrivers(
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
 * Realtime hook for subscribing to a specific driver
 */
export function useRealtimeDriver(
  driverId: string,
  callback: (payload: RealtimeChangePayload) => void,
) {
  const subscriptionIdRef = useRef<string | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!driverId) return;

    subscriptionIdRef.current = realtimeService.subscribeToDriver(driverId, (payload) =>
      callbackRef.current(payload),
    );

    return () => {
      if (subscriptionIdRef.current) {
        realtimeService.unsubscribe(subscriptionIdRef.current);
      }
    };
  }, [driverId]);

  const getConnectionState = useCallback(() => {
    return realtimeService.getConnectionState();
  }, []);

  return {
    connectionState: getConnectionState(),
  };
}
