/**
 * Delivery Progress Hook
 * Calculates progress percentage based on delivery workflow states
 */

import { useMemo } from 'react';

export interface DeliveryProgressState {
  progress: number;
  color: string;
  status: string;
  message: string;
  icon: string;
}

export function useDeliveryProgress(
  orderStatus: string | undefined,
  deliveryStatus: string | undefined
): DeliveryProgressState {
  return useMemo(() => {
    // Determine progress based on workflow states
    let progress = 0;
    let color = '#f97316'; // Orange (default)
    let status = 'pending';
    let message = 'Preparing your order';
    let icon = '☕';

    if (deliveryStatus === 'delivered') {
      progress = 100;
      color = '#10b981'; // Green
      status = 'delivered';
      message = 'Delivered';
      icon = '✓';
    } else if (deliveryStatus === 'arrived') {
      progress = 90;
      color = '#84cc16'; // Bright lime
      status = 'arrived';
      message = 'Almost there';
      icon = '📍';
    } else if (deliveryStatus === 'in_transit') {
      progress = 70;
      color = '#10b981'; // Green
      status = 'in_transit';
      message = 'On the way';
      icon = '🚦';
    } else if (deliveryStatus === 'picked_up') {
      progress = 45;
      color = '#06b6d4'; // Cyan
      status = 'picked_up';
      message = 'Order picked up';
      icon = '📦';
    } else if (deliveryStatus === 'assigned') {
      progress = 25;
      color = '#3b82f6'; // Blue
      status = 'assigned';
      message = 'Driver assigned';
      icon = '🛵';
    } else if (orderStatus === 'ready') {
      progress = 25;
      color = '#3b82f6'; // Blue
      status = 'ready';
      message = 'Ready for pickup';
      icon = '✅';
    } else if (orderStatus === 'preparing') {
      progress = 0;
      color = '#f97316'; // Orange
      status = 'preparing';
      message = 'Preparing your coffee';
      icon = '☕';
    } else if (orderStatus === 'accepted') {
      progress = 10;
      color = '#f97316'; // Orange
      status = 'accepted';
      message = 'Order accepted';
      icon = '✓';
    }

    return {
      progress,
      color,
      status,
      message,
      icon,
    };
  }, [orderStatus, deliveryStatus]);
}
