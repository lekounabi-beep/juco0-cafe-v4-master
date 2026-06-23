/**
 * Realtime hook for order subscriptions
 */

import { useEffect, useRef, useCallback } from 'react';
import { realtimeService } from '../services/realtime.service';

export function useRealtimeOrders(
  callback: (payload: any) => void,
  filter?: { event?: 'INSERT' | 'UPDATE' | 'DELETE'; filter?: string }
) {
  const subscriptionIdRef = useRef<string | null>(null);

  useEffect(() => {
    subscriptionIdRef.current = realtimeService.subscribeToOrders(callback, filter);

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
 * Realtime hook for subscribing to a specific order
 */
export function useRealtimeOrder(
  orderId: string,
  callback: (payload: any) => void
) {
  const subscriptionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    
    subscriptionIdRef.current = realtimeService.subscribeToOrder(orderId, callback);

    return () => {
      if (subscriptionIdRef.current) {
        realtimeService.unsubscribe(subscriptionIdRef.current);
      }
    };
  }, [orderId, callback]);

  const getConnectionState = useCallback(() => {
    return realtimeService.getConnectionState();
  }, []);

  return {
    connectionState: getConnectionState(),
  };
}
