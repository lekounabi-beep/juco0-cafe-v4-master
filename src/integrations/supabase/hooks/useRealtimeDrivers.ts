/**
 * Realtime hook for driver subscriptions
 */

import { useEffect, useRef, useCallback } from 'react';
import { realtimeService } from '../services/realtime.service';

export function useRealtimeDrivers(
  callback: (payload: any) => void,
  filter?: { event?: 'INSERT' | 'UPDATE' | 'DELETE'; filter?: string }
) {
  const subscriptionIdRef = useRef<string | null>(null);

  useEffect(() => {
    subscriptionIdRef.current = realtimeService.subscribeToDrivers(callback, filter);

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
 * Realtime hook for subscribing to a specific driver
 */
export function useRealtimeDriver(
  driverId: string,
  callback: (payload: any) => void
) {
  const subscriptionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!driverId) return;
    
    subscriptionIdRef.current = realtimeService.subscribeToDriver(driverId, callback);

    return () => {
      if (subscriptionIdRef.current) {
        realtimeService.unsubscribe(subscriptionIdRef.current);
      }
    };
  }, [driverId, callback]);

  const getConnectionState = useCallback(() => {
    return realtimeService.getConnectionState();
  }, []);

  return {
    connectionState: getConnectionState(),
  };
}
