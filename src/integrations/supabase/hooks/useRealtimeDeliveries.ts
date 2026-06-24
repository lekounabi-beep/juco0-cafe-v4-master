/**
 * Realtime hook for delivery subscriptions
 */

import { useEffect, useRef, useCallback } from 'react';
import { realtimeService } from '../services/realtime.service';

export function useRealtimeDeliveries(
  callback: (payload: any) => void,
  filter?: { event?: 'INSERT' | 'UPDATE' | 'DELETE'; filter?: string }
) {
  const subscriptionIdRef = useRef<string | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const filterKey = filter ? `${filter.event ?? '*'}:${filter.filter ?? ''}` : '*';

  useEffect(() => {
    subscriptionIdRef.current = realtimeService.subscribeToDeliveries(
      (payload) => callbackRef.current(payload),
      filter
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
 * Realtime hook for subscribing to a specific delivery assignment
 */
export function useRealtimeDeliveryAssignment(
  assignmentId: string,
  callback: (payload: any) => void
) {
  const subscriptionIdRef = useRef<string | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!assignmentId) return;

    subscriptionIdRef.current = realtimeService.subscribeToDeliveryAssignment(
      assignmentId,
      (payload) => callbackRef.current(payload)
    );

    return () => {
      if (subscriptionIdRef.current) {
        realtimeService.unsubscribe(subscriptionIdRef.current);
      }
    };
  }, [assignmentId]);

  const getConnectionState = useCallback(() => {
    return realtimeService.getConnectionState();
  }, []);

  return {
    connectionState: getConnectionState(),
  };
}
