/**
 * Deterministic driver accept flow — timeout-safe, explicit result, no UI deadlocks.
 */

import { driverAcceptOrder } from '../../../../app/actions/create-delivery-assignment';
import { fetchDriverActiveDelivery } from '../../../../app/actions/driver-delivery-sync';
import { isUUID } from '@/shared/utils/uuid';
import {
  enqueue,
  isNetworkOnline,
} from './offline-queue.service';
import {
  setOptimisticDelivery,
  type OptimisticDelivery,
  type OptimisticOrder,
} from './driver-offline-state';

export const ACCEPT_FLOW_TIMEOUT_MS = 8_000;

export type AcceptResult =
  | { ok: true; state: 'success' | 'queued' | 'synced_existing' }
  | { ok: false; reason: string };

function buildOptimisticAccept(
  orderId: string,
  driverId: string,
  orderSnapshot: OptimisticOrder
): OptimisticDelivery {
  const now = new Date().toISOString();
  return {
    id: `pending-${orderId}`,
    order_id: orderId,
    driver_id: driverId,
    status: 'assigned',
    assigned_at: now,
    accepted_at: now,
    order: { ...orderSnapshot, status: 'assigned' },
  };
}

export async function withAcceptTimeout<T>(
  label: string,
  promise: Promise<T>,
  ms: number = ACCEPT_FLOW_TIMEOUT_MS
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Accept an order with guaranteed resolution within ACCEPT_FLOW_TIMEOUT_MS.
 * Never awaits offline sync — queued accepts return immediately.
 */
export async function safeAcceptOrder(
  orderId: string,
  driverId: string,
  orderSnapshot: OptimisticOrder
): Promise<AcceptResult> {
  console.log('[ACCEPT_FLOW_START]', { orderId, driverId });

  if (!isUUID(orderId)) {
    const reason = 'Invalid order_id: UUID required';
    console.log('[ACCEPT_RESULT]', { ok: false, reason });
    return { ok: false, reason };
  }

  if (!isUUID(driverId)) {
    const reason = 'Invalid driver_id: UUID required (use drivers.id from profile)';
    console.log('[ACCEPT_RESULT]', { ok: false, reason });
    return { ok: false, reason };
  }

  if (!isNetworkOnline()) {
    console.log('[ACCEPT_BEFORE_API]', { mode: 'offline_queue' });
    const optimistic = buildOptimisticAccept(orderId, driverId, orderSnapshot);
    setOptimisticDelivery(driverId, optimistic);
    enqueue('ACCEPT_ORDER', { orderId, driverId, orderSnapshot });
    console.log('[ACCEPT_AFTER_API]', { mode: 'offline_queue' });
    const result: AcceptResult = { ok: true, state: 'queued' };
    console.log('[ACCEPT_RESULT]', result);
    return result;
  }

  try {
    console.log('[ACCEPT_BEFORE_API]', { mode: 'driverAcceptOrder' });
    const apiResult = await withAcceptTimeout(
      'driverAcceptOrder',
      driverAcceptOrder(orderId, driverId)
    );
    console.log('[ACCEPT_AFTER_API]', apiResult);

    if (apiResult.success && apiResult.assignment) {
      const result: AcceptResult = { ok: true, state: 'success' };
      console.log('[ACCEPT_RESULT]', result);
      return result;
    }

    if (apiResult.syncAssignment) {
      const result: AcceptResult = { ok: true, state: 'synced_existing' };
      console.log('[ACCEPT_RESULT]', result);
      return result;
    }

    if (apiResult.error?.toLowerCase().includes('already has an active delivery')) {
      try {
        const sync = await withAcceptTimeout(
          'fetchDriverActiveDelivery',
          fetchDriverActiveDelivery(driverId)
        );
        if (sync.success && sync.assignment) {
          const result: AcceptResult = { ok: true, state: 'synced_existing' };
          console.log('[ACCEPT_RESULT]', result);
          return result;
        }
      } catch (syncErr) {
        console.log('[ACCEPT_CATCH_ERROR]', syncErr);
      }
      const result: AcceptResult = {
        ok: false,
        reason: 'Driver already has an active delivery',
      };
      console.log('[ACCEPT_RESULT]', result);
      return result;
    }

    const result: AcceptResult = {
      ok: false,
      reason: apiResult.error || 'Failed to accept order',
    };
    console.log('[ACCEPT_RESULT]', result);
    return result;
  } catch (err) {
    console.log('[ACCEPT_CATCH_ERROR]', err);
    const result: AcceptResult = {
      ok: false,
      reason: err instanceof Error ? err.message : 'Failed to accept order',
    };
    console.log('[ACCEPT_RESULT]', result);
    return result;
  } finally {
    console.log('[ACCEPT_FINALLY]');
  }
}
