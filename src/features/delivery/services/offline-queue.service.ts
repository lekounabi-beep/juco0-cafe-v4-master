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
import { shouldDriverCoordinatorHandleOnline } from '@/lib/network/driver-network';

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
/** Hard caps — localStorage is ~5MB; GPS batches must stay small. */
const MAX_QUEUE_ITEMS = 60;
const MAX_GPS_BUFFER_POINTS = 80;
const MAX_GPS_POINTS_PER_ITEM = 40;
const MAX_FAILED_ITEMS = 8;

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
  deliveryPendingCount: number;
  failedCount: number;
};

type GpsBufferPoint = GPSLocationUpdate & {
  assignmentId: string;
  driverId: string;
};

let isSyncing = false;
let syncPromise: Promise<void> | null = null;
const syncListeners = new Set<SyncListener>();

function isDeliveryAction(type: OfflineActionType): boolean {
  return DELIVERY_TYPES.has(type);
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return err.name === 'QuotaExceededError' || err.code === 22;
}

function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn(`[offline-queue] storage write failed for ${key}`, err);
      return false;
    }
    return false;
  }
}

function trimGpsPoints(points: GpsBufferPoint[]): GpsBufferPoint[] {
  if (points.length <= MAX_GPS_POINTS_PER_ITEM) return points;
  return points.slice(-MAX_GPS_POINTS_PER_ITEM);
}

function compactGpsPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const points = payload.points;
  if (!Array.isArray(points)) return payload;
  return { ...payload, points: trimGpsPoints(points as GpsBufferPoint[]) };
}

/** Drop oldest GPS queue items first; keep delivery milestones. */
function pruneQueue(queue: OfflineQueueItem[]): OfflineQueueItem[] {
  const delivery = queue.filter((item) => isDeliveryAction(item.type));
  const gps = queue
    .filter((item) => item.type === 'GPS_UPDATE')
    .map((item) => ({
      ...item,
      payload: compactGpsPayload(item.payload),
    }));
  const failed = queue.filter((item) => item.failed).slice(-MAX_FAILED_ITEMS);

  const deliveryCap = Math.min(delivery.length, 20);
  const trimmedDelivery = delivery.slice(-deliveryCap);

  let gpsBudget = Math.max(0, MAX_QUEUE_ITEMS - trimmedDelivery.length - failed.length);
  const trimmedGps = gps.slice(-gpsBudget);

  const merged = [...trimmedDelivery, ...trimmedGps, ...failed];
  const seen = new Set<string>();
  return merged.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
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

  let pruned = pruneQueue(queue);
  let json = JSON.stringify(pruned);

  if (!safeSetItem(QUEUE_KEY, json)) {
    pruned = pruneQueue(pruned.filter((item) => item.type !== 'GPS_UPDATE'));
    json = JSON.stringify(pruned);
    if (!safeSetItem(QUEUE_KEY, json)) {
      const deliveryOnly = pruned.filter((item) => isDeliveryAction(item.type)).slice(-10);
      safeSetItem(QUEUE_KEY, JSON.stringify(deliveryOnly));
      console.warn('[offline-queue] storage full — kept delivery actions only');
    } else {
      console.warn('[offline-queue] storage full — dropped GPS queue items');
    }
  }

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

function findMergeableGpsItem(
  queue: OfflineQueueItem[],
  assignmentId: string,
  driverId: string
): OfflineQueueItem | undefined {
  return queue.find(
    (item) =>
      item.type === 'GPS_UPDATE' &&
      !item.failed &&
      item.payload.assignmentId === assignmentId &&
      item.payload.driverId === driverId
  );
}

function enqueueGpsPoints(points: GpsBufferPoint[]): void {
  if (points.length === 0) return;

  const assignmentId = points[0]!.assignmentId;
  const driverId = points[0]!.driverId;
  const queue = getQueue();
  const existing = findMergeableGpsItem(queue, assignmentId, driverId);

  if (existing) {
    const merged = trimGpsPoints([
      ...((existing.payload.points as GpsBufferPoint[]) ?? []),
      ...points,
    ]);
    const index = queue.findIndex((item) => item.id === existing.id);
    if (index !== -1) {
      queue[index] = {
        ...existing,
        payload: { assignmentId, driverId, points: merged },
        timestamp: Date.now(),
      };
      saveQueue(queue);
      return;
    }
  }

  const item: OfflineQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'GPS_UPDATE',
    payload: {
      assignmentId,
      driverId,
      points: trimGpsPoints(points),
    },
    timestamp: Date.now(),
    retryCount: 0,
  };

  queue.push(item);
  saveQueue(queue);
}

/** Enqueue a fallback action. Callers must only use when offline or after request failure. */
export function enqueue(
  type: OfflineActionType,
  payload: Record<string, unknown>
): string {
  if (type === 'GPS_UPDATE') {
    const points = payload.points as GpsBufferPoint[] | undefined;
    if (Array.isArray(points) && points.length > 0) {
      enqueueGpsPoints(points);
      if (isNetworkOnline()) {
        void syncOfflineQueue();
      }
      return 'gps-batch';
    }
  }

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

function loadGpsBuffer(): GpsBufferPoint[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GPS_BUFFER_KEY);
    const parsed = raw ? (JSON.parse(raw) as GpsBufferPoint[]) : [];
    return parsed.length > MAX_GPS_BUFFER_POINTS
      ? parsed.slice(-MAX_GPS_BUFFER_POINTS)
      : parsed;
  } catch {
    return [];
  }
}

function saveGpsBuffer(points: GpsBufferPoint[]) {
  if (typeof window === 'undefined') return;
  const trimmed = points.length > MAX_GPS_BUFFER_POINTS
    ? points.slice(-MAX_GPS_BUFFER_POINTS)
    : points;
  if (!safeSetItem(GPS_BUFFER_KEY, JSON.stringify(trimmed))) {
    const minimal = trimmed.slice(-20);
    safeSetItem(GPS_BUFFER_KEY, JSON.stringify(minimal));
    console.warn('[offline-queue] GPS buffer trimmed due to storage quota');
  }
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

  enqueueGpsPoints(buffer);
  saveGpsBuffer([]);
}

function flushRemainingGpsBuffer() {
  const buffer = loadGpsBuffer();
  if (buffer.length === 0) return;
  enqueueGpsPoints(buffer);
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

  if (item.type === 'GPS_UPDATE' && nextRetry >= 2) {
    removeItem(item.id);
    console.warn('[offline-queue] dropped GPS batch after repeated failures');
    return;
  }

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

/** Drop in-flight sync promise — used when reconnect aborts stale work. */
export function resetOfflineQueueSync(): void {
  syncPromise = null;
  isSyncing = false;
  notifySyncState();
}

/** Emergency trim — call on app boot if storage was corrupted/full. */
export function repairOfflineQueueStorage(): void {
  if (typeof window === 'undefined') return;
  saveQueue(getQueue());
  saveGpsBuffer(loadGpsBuffer());
}

if (typeof window !== 'undefined') {
  repairOfflineQueueStorage();

  window.addEventListener(NETWORK_ONLINE_EVENT, () => {
    if (shouldDriverCoordinatorHandleOnline()) return;
    void syncOfflineQueue();
  });

  if (navigator.onLine) {
    void syncOfflineQueue();
  }
}
