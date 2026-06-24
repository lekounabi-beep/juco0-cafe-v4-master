/**
 * Offline queue sync for non-GPS driver actions.
 * Server actions are loaded dynamically so GPS-only flows never import app/actions.
 */

import { updateDriverAvailability } from '@/integrations/supabase/services/driver.service';
import { isUUID } from '@/shared/utils/uuid';
import { withAcceptTimeout } from './safe-accept-order';
import type { DeliveryStatus, OrderStatus } from '../types/delivery.types';

function isAlreadyAtStatus(error: string | undefined, status: string): boolean {
  if (!error) return false;
  const normalized = error.toLowerCase();
  return normalized.includes(status.replace('_', ' ')) || normalized.includes(status);
}

async function loadAssignmentActions() {
  return import('../../../../app/actions/create-delivery-assignment');
}

async function loadWorkflowActions() {
  return import('../../../../app/actions/driver-workflow');
}

async function loadDeliverySync() {
  return import('../../../../app/actions/driver-delivery-sync');
}

export async function syncAcceptOrder(payload: Record<string, unknown>): Promise<boolean> {
  const orderId = payload.orderId as string;
  const driverId = payload.driverId as string;

  if (!isUUID(orderId) || !isUUID(driverId)) {
    return false;
  }

  const { driverAcceptOrder } = await loadAssignmentActions();
  const result = await withAcceptTimeout(
    'syncAcceptOrder',
    driverAcceptOrder(orderId, driverId)
  );

  if (result.success) return true;
  if (result.syncAssignment) return true;

  const error = result.error?.toLowerCase() ?? '';
  if (error.includes('already has an active delivery') || error.includes('already assigned')) {
    const { fetchDriverActiveDelivery } = await loadDeliverySync();
    const sync = await withAcceptTimeout(
      'syncAcceptOrder.fetchActive',
      fetchDriverActiveDelivery(driverId)
    );
    return sync.success;
  }

  return false;
}

export async function syncDeliveryTransition(
  payload: Record<string, unknown>,
  deliveryStatus: DeliveryStatus,
  orderStatus: OrderStatus
): Promise<boolean> {
  const assignmentId = payload.assignmentId as string;
  const orderId = payload.orderId as string;
  const driverId = payload.driverId as string;

  const { driverTransitionDelivery, driverTransitionOrder } = await loadWorkflowActions();

  const deliveryResult = await driverTransitionDelivery(assignmentId, driverId, deliveryStatus);
  if (!deliveryResult.success && !isAlreadyAtStatus(deliveryResult.error, deliveryStatus)) {
    return false;
  }

  const orderResult = await driverTransitionOrder(orderId, driverId, orderStatus);
  if (!orderResult.success && !isAlreadyAtStatus(orderResult.error, orderStatus)) {
    return false;
  }

  if (deliveryStatus === 'delivered') {
    await updateDriverAvailability(driverId, 'online');
  }

  return true;
}
