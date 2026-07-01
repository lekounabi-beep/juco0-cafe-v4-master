/**
 * Module-level single-flight guards for driver refresh server actions.
 * Cleared on offline / reconnect / timeout so stale promises cannot block recovery.
 */

let refreshActiveDeliveryInFlight: Promise<boolean> | null = null;
let refreshOrdersInFlight: Promise<void> | null = null;
let generation = 0;

export function clearDriverRefreshInFlight(reason: string): void {
  generation += 1;
  refreshActiveDeliveryInFlight = null;
  refreshOrdersInFlight = null;
  if (process.env.NODE_ENV === 'development') {
    console.info('[Network] driver_refresh_inflight_cleared', { reason, generation });
  }
}

export function getDriverRefreshGeneration(): number {
  return generation;
}

export function trackRefreshActiveDeliveryPromise(promise: Promise<boolean>): void {
  refreshActiveDeliveryInFlight = promise;
}

export function trackRefreshOrdersPromise(promise: Promise<void>): void {
  refreshOrdersInFlight = promise;
}

export function clearRefreshActiveDeliveryIfCurrent(promise: Promise<boolean>): void {
  if (refreshActiveDeliveryInFlight === promise) {
    refreshActiveDeliveryInFlight = null;
  }
}

export function clearRefreshOrdersIfCurrent(promise: Promise<void>): void {
  if (refreshOrdersInFlight === promise) {
    refreshOrdersInFlight = null;
  }
}

export function getRefreshActiveDeliveryInFlight(): Promise<boolean> | null {
  return refreshActiveDeliveryInFlight;
}

export function getRefreshOrdersInFlight(): Promise<void> | null {
  return refreshOrdersInFlight;
}
