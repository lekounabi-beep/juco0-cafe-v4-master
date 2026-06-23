/**
 * Driver Realtime hook
 * Handles realtime subscriptions for order updates
 */

import { useEffect } from 'react';

interface UseDriverRealtimeProps {
  onOrderUpdate: (payload: any) => void;
}

export function useDriverRealtime({ onOrderUpdate }: UseDriverRealtimeProps) {
  useEffect(() => {
    const handleOrderUpdate = (payload: any) => {
      if (payload && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
        // Refresh available orders
        console.log('Order update:', payload);
        onOrderUpdate(payload);
      }
    };

    // Note: useRealtimeOrders requires specific order ID, using general subscription
    // This will be refined in production
    // For now, this is a placeholder for future realtime implementation
  }, [onOrderUpdate]);
}
