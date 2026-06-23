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

  useEffect(() => {
    subscriptionIdRef.current = realtimeService.subscribeToDeliveries(callback, filter);

    return () => {
      if (subscriptionIdRef.current) {
        realtimeService.unsubscribe(subscriptionIdRef.current);
      }
    };
  }, [callback, filter]);

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

  useEffect(() => {
    if (!assignmentId) return;
    
    subscriptionIdRef.current = realtimeService.subscribeToDeliveryAssignment(assignmentId, callback);

    return () => {
      if (subscriptionIdRef.current) {
        realtimeService.unsubscribe(subscriptionIdRef.current);
      }
    };
  }, [assignmentId, callback]);

  const getConnectionState = useCallback(() => {
    return realtimeService.getConnectionState();
  }, []);

  return {
    connectionState: getConnectionState(),
  };
}
