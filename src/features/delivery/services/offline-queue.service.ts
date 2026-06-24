/**
 * Offline queue — fallback only when navigator is offline or a request fails.
 * Delivery actions are never queued while online; GPS is buffered only offline/on failure.
 */

import { recordDriverLocationSafe } from './record-driver-location';
import { syncAcceptOrder, syncDeliveryTransition } from './driver-offline-sync';
import { clearOptimisticDelivery } from './driver-offline-state';
import type { DeliveryStatus, OrderStatus } from '../types/delivery.types';
import type { GPSLocationUpdate } from '../types/delivery.types';
import { NETWORK_ONLINE_EVENT } from '@/hooks/useNetworkStatus';

export type OfflineActionType =
  | 'ACCEPT_ORDER'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'GPS_UPDATE';

export type OfflineQueueItem = {
  id: string;
  type: OfflineActionType;
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  failed?: boolean;
};

const QUEUE_KEY = 'driver_offline_queue';
const GPS_BUFFER_KEY = 'offline_gps_buffer';
const MAX_RETRIES = 5;
const GPS_BATCH_SIZE = 5;

const DELIVERY_TYPES = new Set<OfflineActionType>([
  'ACCEPT_ORDER',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED',
  'DELIVERED',
]);

type SyncListener = (state: SyncState) => void;

export type SyncState = {
  isSyncing: boolean;
  pendingCount: number;
  /** Delivery actions only — drives the sync banner. */
  deliveryPendingCount: number;
  failedCount: number;
};

let isSyncing = false;
let syncPromise: Promise<void> | null = null;
const syncListeners = new Set<SyncListener>();

function isDeliveryAction(type: OfflineActionType): boolean {
  return DELIVERY_TYPES.has(type);
}

function getPendingQueue(): OfflineQueueItem[] {
  return getQueue().filter((item) => !item.failed);
}

function getDeliveryPendingCount(): number {
  return getPendingQueue().filter((item) => isDeliveryAction(item.type)).length;
}

function sortQueueByPriority(queue: OfflineQueueItem[]): OfflineQueueItem[] {
  return [...queue].sort((a, b) => {
    const aGps = a.type === 'GPS_UPDATE' ? 1 : 0;
    const bGps = b.type === 'GPS_UPDATE' ? 1 : 0;
    if (aGps !== bGps) return aGps - bGps;
    return a.timestamp - b.timestamp;
  });
}

function notifySyncState() {
  syncListeners.forEach((listener) => listener(getSyncState()));
}

export function subscribeSyncState(listener: SyncListener): () => void {
  syncListeners.add(listener);
  listener(getSyncState());
  return () => syncListeners.delete(listener);
}

export function getSyncState(): SyncState {
  const queue = getQueue();
  const active = queue.filter((item) => !item.failed);

  return {
    isSyncing,
    pendingCount: active.length,
    deliveryPendingCount: active.filter((item) => isDeliveryAction(item.type)).length,
    failedCount: queue.filter((item) => item.failed).length,
  };
}

export function isNetworkOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function saveQueue(queue: OfflineQueueItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  notifySyncState();
}

export function getQueue(): OfflineQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineQueueItem[]) : [];
  } catch {
    return [];
  }
}

function updateQueueItem(
  id: string,
  updater: (item: OfflineQueueItem) => OfflineQueueItem
): void {
  const queue = getQueue();
  const index = queue.findIndex((item) => item.id === id);
  if (index === -1) return;
  queue[index] = updater(queue[index]);
  saveQueue(queue);
}

/** Enqueue a fallback action. Callers must only use when offline or after request failure. */
export function enqueue(
  type: OfflineActionType,
  payload: Record<string, unknown>
): string {
  const item: OfflineQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  };

  const queue = getQueue();
  queue.push(item);
  saveQueue(queue);

  if (isNetworkOnline()) {
    void syncOfflineQueue();
  }

  return item.id;
}

export function removeItem(id: string) {
  saveQueue(getQueue().filter((item) => item.id !== id));
}

type GpsBufferPoint = GPSLocationUpdate & {
  assignmentId: string;
  driverId: string;
};

function loadGpsBuffer(): GpsBufferPoint[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GPS_BUFFER_KEY);
    return raw ? (JSON.parse(raw) as GpsBufferPoint[]) : [];
  } catch {
    return [];
  }
}

function saveGpsBuffer(points: GpsBufferPoint[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GPS_BUFFER_KEY, JSON.stringify(points));
}

/** Buffer GPS when offline or insert failed. Flushed into queue on sync. */
export function addOfflineGpsPoint(
  assignmentId: string,
  driverId: string,
  location: GPSLocationUpdate
) {
  const buffer = loadGpsBuffer();
  buffer.push({ ...location, assignmentId, driverId });
  saveGpsBuffer(buffer);

  if (buffer.length >= GPS_BATCH_SIZE) {
    flushGpsBufferToQueue();
  }
}

function flushGpsBufferToQueue() {
  const buffer = loadGpsBuffer();
  if (buffer.length === 0) return;

  enqueue('GPS_UPDATE', { points: buffer });
  saveGpsBuffer([]);
}

function flushRemainingGpsBuffer() {
  const buffer = loadGpsBuffer();
  if (buffer.length === 0) return;
  enqueue('GPS_UPDATE', { points: buffer });
  saveGpsBuffer([]);
}

function clearOptimisticForItem(item: OfflineQueueItem) {
  const driverId = item.payload.driverId as string | undefined;
  if (driverId) {
    clearOptimisticDelivery(driverId);
  }
}

async function processAcceptOrder(payload: Record<string, unknown>): Promise<boolean> {
  const ok = await syncAcceptOrder(payload);
  if (ok) {
    const driverId = payload.driverId as string;
    if (driverId) clearOptimisticDelivery(driverId);
  }
  return ok;
}

async function processDeliveryTransition(
  payload: Record<string, unknown>,
  deliveryStatus: DeliveryStatus,
  orderStatus: OrderStatus
): Promise<boolean> {
  const ok = await syncDeliveryTransition(payload, deliveryStatus, orderStatus);
  if (ok && deliveryStatus === 'delivered') {
    const driverId = payload.driverId as string;
    if (driverId) clearOptimisticDelivery(driverId);
  }
  return ok;
}

async function processGpsUpdate(payload: Record<string, unknown>): Promise<boolean> {
  const points = payload.points as GpsBufferPoint[];
  if (!Array.isArray(points) || points.length === 0) return true;

  for (const point of points) {
    const result = await recordDriverLocationSafe(
      point.assignmentId,
      point.driverId,
      {
        lat: point.lat,
        lng: point.lng,
        accuracy: point.accuracy,
        speed: point.speed,
        heading: point.heading,
        timestamp: point.timestamp,
      },
      { suppressOfflineQueue: true }
    );

    if (!result.success) {
      return false;
    }
  }
  return true;
}

async function processItem(item: OfflineQueueItem): Promise<boolean> {
  switch (item.type) {
    case 'ACCEPT_ORDER':
      return processAcceptOrder(item.payload);
    case 'PICKED_UP':
      return processDeliveryTransition(item.payload, 'picked_up', 'picked_up');
    case 'IN_TRANSIT':
      return processDeliveryTransition(item.payload, 'in_transit', 'in_transit');
    case 'ARRIVED':
      return processDeliveryTransition(item.payload, 'arrived', 'arrived');
    case 'DELIVERED':
      return processDeliveryTransition(item.payload, 'delivered', 'delivered');
    case 'GPS_UPDATE':
      return processGpsUpdate(item.payload);
    default:
      return false;
  }
}

function handleItemFailure(item: OfflineQueueItem): void {
  const nextRetry = item.retryCount + 1;
  if (nextRetry >= MAX_RETRIES) {
    updateQueueItem(item.id, (current) => ({
      ...current,
      retryCount: nextRetry,
      failed: true,
    }));
    if (isDeliveryAction(item.type)) {
      clearOptimisticForItem(item);
    }
    return;
  }

  updateQueueItem(item.id, (current) => ({
    ...current,
    retryCount: nextRetry,
  }));
}

async function runSyncPass(): Promise<void> {
  const pendingBefore = getPendingQueue().length;
  const deliveryBefore = getDeliveryPendingCount();
  console.log(
    `[offline-queue] sync start, pending=${pendingBefore}, delivery=${deliveryBefore}`
  );

  flushRemainingGpsBuffer();

  const batch = sortQueueByPriority(getPendingQueue());

  for (const item of batch) {
    const current = getQueue().find((entry) => entry.id === item.id);
    if (!current || current.failed) continue;

    try {
      const success = await processItem(current);
      if (success) {
        removeItem(current.id);
        continue;
      }
      handleItemFailure(current);
    } catch (error) {
      console.error(`[offline-queue] item ${current.type} (${current.id}) threw:`, error);
      handleItemFailure(current);
    }
  }

  const pendingAfter = getPendingQueue().length;
  const deliveryAfter = getDeliveryPendingCount();
  console.log(
    `[offline-queue] sync end, pending=${pendingAfter}, delivery=${deliveryAfter}`
  );
}

async function runSync(): Promise<void> {
  if (getPendingQueue().length === 0) {
    isSyncing = false;
    notifySyncState();
    return;
  }

  isSyncing = true;
  notifySyncState();

  try {
    await runSyncPass();
  } finally {
    isSyncing = false;
    notifySyncState();

    const remaining = getPendingQueue().length;
    if (remaining > 0 && isNetworkOnline()) {
      void syncOfflineQueue();
    }
  }
}

/** Single-flight sync — drains the fallback queue when online. */
export async function syncOfflineQueue(): Promise<void> {
  if (!isNetworkOnline()) return;
  if (syncPromise) return syncPromise;

  syncPromise = runSync().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

if (typeof window !== 'undefined') {
  window.addEventListener(NETWORK_ONLINE_EVENT, () => {
    void syncOfflineQueue();
  });

  if (navigator.onLine) {
    void syncOfflineQueue();
  }
}
