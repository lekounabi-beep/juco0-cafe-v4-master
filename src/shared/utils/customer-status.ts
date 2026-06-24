/**
 * Customer-facing order status (4-step journey).
 * Internal DB states must never leak to customer UI.
 */

import { assignmentStatusFromTimestamps } from './order-fields';

export type CustomerOrderStep = 'received' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled';

type AssignmentTimestamps = Parameters<typeof assignmentStatusFromTimestamps>[0];

export interface CustomerDeliveryUI {
  step: CustomerOrderStep;
  message: string;
  messageEl: string;
  icon: string;
  progress: number;
  color: string;
}

/** Resolve internal delivery status from assignment timestamps or order fields. */
export function resolveTrackingDeliveryStatus(
  order: { status?: string; delivery_status?: string } | null | undefined,
  assignment?: AssignmentTimestamps | null
): string {
  if (assignment) {
    return assignmentStatusFromTimestamps(assignment);
  }
  return order?.delivery_status || order?.status || 'pending';
}

/** Map internal order + delivery status → customer 4-step model. */
export function getCustomerOrderStep(
  orderStatus?: string,
  deliveryStatus?: string
): CustomerOrderStep {
  const order = orderStatus || 'pending';
  const delivery = deliveryStatus || 'pending';

  if (order === 'cancelled' || delivery === 'cancelled') return 'cancelled';
  if (delivery === 'delivered' || order === 'delivered' || order === 'completed') return 'delivered';
  if (['assigned', 'picked_up', 'in_transit', 'arrived'].includes(delivery)) return 'on_the_way';
  if (['assigned', 'picked_up', 'in_transit', 'arrived'].includes(order)) return 'on_the_way';
  if (order === 'preparing' || order === 'ready') return 'preparing';
  if (order === 'pending' || order === 'accepted') return 'received';
  return 'received';
}

const STEP_UI: Record<CustomerOrderStep, Omit<CustomerDeliveryUI, 'step'>> = {
  received: {
    message: 'Order received',
    messageEl: 'Η παραγγελία σας ελήφθη',
    icon: '✓',
    progress: 15,
    color: '#f97316',
  },
  preparing: {
    message: 'Preparing',
    messageEl: 'Ετοιμάζεται',
    icon: '☕',
    progress: 40,
    color: '#f97316',
  },
  on_the_way: {
    message: 'On the way',
    messageEl: 'Σε διαδρομή',
    icon: '🛵',
    progress: 75,
    color: '#10b981',
  },
  delivered: {
    message: 'Delivered',
    messageEl: 'Παραδόθηκε',
    icon: '✓',
    progress: 100,
    color: '#10b981',
  },
  cancelled: {
    message: 'Cancelled',
    messageEl: 'Ακυρώθηκε',
    icon: '✕',
    progress: 0,
    color: '#ef4444',
  },
};

/** Single source for customer tracking UI (progress ring, status text). */
export function getCustomerDeliveryUI(
  orderStatus?: string,
  deliveryStatus?: string
): CustomerDeliveryUI {
  const step = getCustomerOrderStep(orderStatus, deliveryStatus);
  const base = STEP_UI[step];

  // Sub-progress within "on the way" without exposing internal names
  let progress = base.progress;
  if (step === 'on_the_way') {
    if (deliveryStatus === 'assigned') progress = 55;
    else if (deliveryStatus === 'picked_up') progress = 65;
    else if (deliveryStatus === 'in_transit') progress = 80;
    else if (deliveryStatus === 'arrived') progress = 92;
  }

  return { step, ...base, progress };
}
