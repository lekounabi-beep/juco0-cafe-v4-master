/**
 * Driver actions — execute immediately when online; queue only as offline fallback.
 */

import {
  enqueue,
  isNetworkOnline,
  addOfflineGpsPoint,
} from './offline-queue.service';
import {
  clearOptimisticDelivery,
  updateOptimisticDeliveryStatus,
  type OptimisticDelivery,
  type OptimisticOrder,
} from './driver-offline-state';
import {
  driverTransitionDelivery,
  driverTransitionOrder,
} from '../../../../app/actions/driver-workflow';
import {
  recordDriverLocationSafe,
  localPositionFromGpsUpdate,
} from './record-driver-location';
import type { DeliveryAssignment } from '../types/delivery.types';
import type { DeliveryStatus, OrderStatus, GPSLocationUpdate } from '../types/delivery.types';
import type { OfflineActionType } from './offline-queue.service';
import { getOptimisticDelivery } from './driver-offline-state';
import { safeAcceptOrder, type AcceptResult } from './safe-accept-order';

const ACTION_TO_STATUS: Record<
  string,
  { delivery: DeliveryStatus; order: OrderStatus; field?: keyof OptimisticDelivery }
> = {
  picked_up: { delivery: 'picked_up', order: 'picked_up', field: 'picked_up_at' },
  start_delivery: { delivery: 'in_transit', order: 'in_transit', field: 'started_delivery_at' },
  arrived: { delivery: 'arrived', order: 'arrived', field: 'arrived_at' },
  delivered: { delivery: 'delivered', order: 'delivered', field: 'delivered_at' },
};

const UI_ACTION_TO_QUEUE: Record<string, OfflineActionType> = {
  picked_up: 'PICKED_UP',
  start_delivery: 'IN_TRANSIT',
  arrived: 'ARRIVED',
  delivered: 'DELIVERED',
};

function acceptResultToAssignment(
  result: AcceptResult,
  driverId: string
): DeliveryAssignment | OptimisticDelivery {
  if (!result.ok) {
    throw new Error(result.reason);
  }

  if (result.state === 'queued') {
    const optimistic = getOptimisticDelivery(driverId);
    if (optimistic) return optimistic;
    throw new Error('Queued accept missing optimistic state');
  }

  throw new Error('Accept succeeded but assignment payload unavailable — refresh active delivery');
}

/** @deprecated Prefer safeAcceptOrder — returns explicit AcceptResult without throwing on failure */
export async function acceptOrderWithOffline(
  orderId: string,
  driverId: string,
  orderSnapshot: OptimisticOrder
): Promise<DeliveryAssignment | OptimisticDelivery> {
  const result = await safeAcceptOrder(orderId, driverId, orderSnapshot);
  return acceptResultToAssignment(result, driverId);
}

export { safeAcceptOrder, type AcceptResult };

export async function runDeliveryTransitionWithOffline(
  action: string,
  assignmentId: string,
  orderId: string,
  driverId: string
): Promise<boolean> {
  const mapping = ACTION_TO_STATUS[action];
  const queueType = UI_ACTION_TO_QUEUE[action];
  if (!mapping || !queueType) return false;

  if (!isNetworkOnline()) {
    updateOptimisticDeliveryStatus(driverId, mapping.delivery, mapping.field);
    enqueue(queueType, { assignmentId, orderId, driverId });
    if (action === 'delivered') {
      clearOptimisticDelivery(driverId);
    }
    return true;
  }

  const deliveryResult = await driverTransitionDelivery(assignmentId, driverId, mapping.delivery);
  if (!deliveryResult.success) return false;

  const orderResult = await driverTransitionOrder(orderId, driverId, mapping.order);
  if (!orderResult.success) return false;

  if (action === 'delivered') {
    clearOptimisticDelivery(driverId);
  }

  return true;
}

export async function recordDriverLocationWithOffline(
  assignmentId: string,
  driverId: string,
  location: GPSLocationUpdate
): Promise<{ success: boolean; localFallback: { lat: number; lng: number } | null }> {
  const localFallback = localPositionFromGpsUpdate(location);

  if (!isNetworkOnline()) {
    addOfflineGpsPoint(assignmentId, driverId, location);
    return { success: false, localFallback };
  }

  const result = await recordDriverLocationSafe(assignmentId, driverId, location);
  if (!result.success) {
    addOfflineGpsPoint(assignmentId, driverId, location);
    return { success: false, localFallback };
  }

  return { success: true, localFallback: null };
}
