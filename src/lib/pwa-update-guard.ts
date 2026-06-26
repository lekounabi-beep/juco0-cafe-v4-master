/**
 * Coordinates PWA service-worker activation with active driver delivery.
 * Updates are user-initiated (or flushed after delivery) — never forced on focus.
 */

let blockReload = false;
let waitingWorker: ServiceWorker | null = null;
let deferredWorker: ServiceWorker | null = null;

export function setPwaDeliveryActive(active: boolean): void {
  blockReload = active;
  if (!active) {
    tryFlushDeferredUpdate();
  }
}

export function isPwaReloadBlocked(): boolean {
  return blockReload;
}

export function noteWaitingPwaWorker(worker: ServiceWorker): void {
  waitingWorker = worker;
}

export function hasPendingPwaUpdate(): boolean {
  return waitingWorker != null || deferredWorker != null;
}

/** User confirmed update — skipWaiting unless delivery is active. */
export function applyPwaUpdate(): 'applied' | 'deferred' | 'none' {
  const worker = waitingWorker ?? deferredWorker;
  if (!worker) return 'none';

  if (blockReload) {
    deferredWorker = worker;
    waitingWorker = null;
    return 'deferred';
  }

  waitingWorker = null;
  deferredWorker = null;
  worker.postMessage({ type: 'SKIP_WAITING' });
  return 'applied';
}

function tryFlushDeferredUpdate(): void {
  if (blockReload) return;
  const worker = deferredWorker ?? waitingWorker;
  if (!worker) return;
  deferredWorker = null;
  waitingWorker = null;
  worker.postMessage({ type: 'SKIP_WAITING' });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pwa:update-applied'));
  }
}
