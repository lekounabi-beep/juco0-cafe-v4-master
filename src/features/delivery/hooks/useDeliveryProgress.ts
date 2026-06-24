/**
 * Delivery Progress Hook
 * Customer-facing progress only (4-step journey).
 */

import { useMemo } from 'react';
import { getCustomerDeliveryUI } from '@/shared/utils/customer-status';

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
    const ui = getCustomerDeliveryUI(orderStatus, deliveryStatus);
    return {
      progress: ui.progress,
      color: ui.color,
      status: ui.step,
      message: ui.messageEl,
      icon: ui.icon,
    };
  }, [orderStatus, deliveryStatus]);
}
