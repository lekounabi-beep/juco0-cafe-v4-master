/**
 * Driver PWA network coordinator — single source of truth for online/offline/reconnecting.
 * Client-only; activated when the driver app mounts useDriverNetwork().
 */

import {
  AbortableTimeoutError,
  withAbortableTimeout,
} from '@/lib/network/with-abortable-timeout';
import { getRefreshActiveDeliveryInFlight } from '@/features/delivery/services/driver-refresh-inflight';

export type DriverNetworkPhase = 'online' | 'offline' | 'reconnecting';

export type DriverNetworkState = {
  phase: DriverNetworkPhase;
  isVisible: boolean;
};

export type DriverNetworkLogPayload = {
  durationMs?: number;
  attempt?: number;
  reason?: string;
  phase?: DriverNetworkPhase;
  step?: string;
  hasActive?: boolean;
  error?: unknown;
  elapsedMs?: number;
  refreshInFlight?: boolean;
  syncInFlight?: boolean;
};

type ReconnectForensicStep =
  | 'reconnectRealtime'
  | 'syncOfflineQueue'
  | 'refreshActiveDelivery'
  | 'refreshOrders';

export type DriverReconnectHandlers = {
  reconnectRealtime: () => Promise<void>;
  syncOfflineQueue: () => Promise<void>;
  refreshActiveDelivery: () => Promise<boolean>;
  refreshOrders: () => Promise<void>;
  abortStaleRefreshes: () => void;
  resetOfflineSync: () => void;
};

type NetworkListener = (state: DriverNetworkState) => void;
type PollingResumeListener = () => void;

const BACKOFF_MS = [1000, 2000, 5000, 10000, 30000] as const;
const POLL_REQUEST_TIMEOUT_MS = 15_000;
const RECONNECT_STEP_TIMEOUT_MS = 15_000;
const RECONNECT_WATCHDOG_MS = 15_000;
const MAX_WATCHDOG_ESCALATIONS = 3;

let currentState: DriverNetworkState = {
  phase:
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  isVisible: typeof document !== 'undefined' ? !document.hidden : true,
};

let coordinatorActive = false;
let monitoringStarted = false;
let backoffAttempt = 0;
let watchdogTriggerCount = 0;
let reconnectInFlight = false;
/** Tracks the active attempt only while pending; always null after finally. */
let reconnectPromise: Promise<void> | null = null;
let backoffTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectWatchdogTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectingSince: number | null = null;

let handlers: DriverReconnectHandlers | null = null;

const networkListeners = new Set<NetworkListener>();
const pollingResumeListeners = new Set<PollingResumeListener>();
const pollAbortControllers = new Set<AbortController>();

function emitState(): void {
  networkListeners.forEach((listener) => listener(currentState));
}

function commitNetworkState(next: DriverNetworkState): void {
  if (
    currentState.phase === next.phase &&
    currentState.isVisible === next.isVisible
  ) {
    return;
  }
  currentState = next;
  emitState();
}

function bumpNetworkStateSnapshot(): void {
  currentState = { ...currentState };
  emitState();
}

export function logDriverNetwork(
  event:
    | 'offline'
    | 'reconnect_started'
    | 'reconnect_completed'
    | 'reconnect_failed'
    | 'reconnect_retry_scheduled'
    | 'reconnect_timeout'
    | 'reconnect_watchdog_triggered'
    | 'reconnect_promise_cleared'
    | 'reconnect_force_online'
    | 'polling_paused'
    | 'polling_resumed'
    | 'request_aborted'
    | 'request_timeout',
  payload: DriverNetworkLogPayload = {},
): void {
  console.info(`[Network] ${event}`, {
    phase: currentState.phase,
    attempt: backoffAttempt,
    ...payload,
  });
}

/** Temporary forensic logger — remove after reconnect hang is identified. */
function logReconnectForensic(
  event: 'step_start' | 'step_done' | 'reconnect_completed' | 'reconnect_failed',
  payload: DriverNetworkLogPayload = {},
): void {
  console.info(`[Network] ${event}`, {
    phase: currentState.phase,
    attempt: backoffAttempt,
    elapsedMs: reconnectingSince != null ? Date.now() - reconnectingSince : undefined,
    ...payload,
  });
}

function setPhase(next: DriverNetworkPhase): void {
  if (currentState.phase === next) return;
  const prev = currentState.phase;
  commitNetworkState({ ...currentState, phase: next });

  if (next === 'reconnecting') {
    reconnectingSince = Date.now();
    startReconnectWatchdog();
  } else {
    clearReconnectWatchdog();
    reconnectingSince = null;
    if (next === 'online') {
      watchdogTriggerCount = 0;
    }
  }

  if (prev !== 'offline' && next === 'offline') {
    logDriverNetwork('offline');
    logDriverNetwork('polling_paused', { reason: 'offline' });
  }
  if (prev === 'offline' && next === 'reconnecting') {
    logDriverNetwork('polling_paused', { reason: 'reconnecting' });
  }
}

export function getDriverNetworkState(): DriverNetworkState {
  return currentState;
}

export function getDriverNetworkPhase(): DriverNetworkPhase {
  return currentState.phase;
}

export function subscribeDriverNetwork(listener: NetworkListener): () => void {
  networkListeners.add(listener);
  listener(getDriverNetworkState());
  return () => networkListeners.delete(listener);
}

export function onDriverPollingResumed(listener: PollingResumeListener): () => void {
  pollingResumeListeners.add(listener);
  return () => pollingResumeListeners.delete(listener);
}

export function enableDriverNetworkCoordinator(): void {
  if (coordinatorActive) return;
  coordinatorActive = true;
  bumpNetworkStateSnapshot();
}

export function disableDriverNetworkCoordinator(): void {
  if (!coordinatorActive) return;
  coordinatorActive = false;
  handlers = null;
  clearBackoffTimer();
  clearReconnectWatchdog();
  clearReconnectInFlight('coordinator_disabled');
  bumpNetworkStateSnapshot();
}

export function shouldDriverCoordinatorHandleOnline(): boolean {
  return coordinatorActive;
}

export function registerDriverReconnectHandlers(next: DriverReconnectHandlers): () => void {
  handlers = next;
  return () => {
    if (handlers === next) handlers = null;
  };
}

export function registerPollAbortController(controller: AbortController): void {
  pollAbortControllers.add(controller);
}

export function unregisterPollAbortController(controller: AbortController): void {
  pollAbortControllers.delete(controller);
}

export function cancelStaleDriverRequests(reason = 'reconnect'): void {
  for (const controller of pollAbortControllers) {
    controller.abort();
    logDriverNetwork('request_aborted', { reason });
  }
  pollAbortControllers.clear();
}

export function isDriverPollingAllowed(): boolean {
  if (!coordinatorActive) return true;
  return currentState.phase === 'online' && currentState.isVisible;
}

export function isDriverRefreshAllowed(): boolean {
  if (!coordinatorActive) return true;
  if (currentState.phase !== 'online') return false;
  return currentState.isVisible;
}

export function shouldSkipDriverRealtimeCallback(): boolean {
  if (!coordinatorActive) {
    return typeof navigator !== 'undefined' && !navigator.onLine;
  }
  return currentState.phase !== 'online';
}

export function getPollRequestTimeoutMs(): number {
  return POLL_REQUEST_TIMEOUT_MS;
}

function notifyPollingResumed(): void {
  logDriverNetwork('polling_resumed');
  pollingResumeListeners.forEach((listener) => listener());
}

function clearBackoffTimer(): void {
  if (backoffTimer) {
    clearTimeout(backoffTimer);
    backoffTimer = null;
  }
}

function clearReconnectWatchdog(): void {
  if (reconnectWatchdogTimer) {
    clearTimeout(reconnectWatchdogTimer);
    reconnectWatchdogTimer = null;
  }
}

function clearReconnectInFlight(reason: string): void {
  const hadWork = reconnectInFlight || reconnectPromise !== null;
  reconnectInFlight = false;
  reconnectPromise = null;
  if (hadWork) {
    logDriverNetwork('reconnect_promise_cleared', { reason });
  }
}

function abortStaleReconnectWork(reason: string): void {
  cancelStaleDriverRequests(reason);
  handlers?.abortStaleRefreshes?.();
  handlers?.resetOfflineSync?.();
}

async function runReconnectStep<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const stepStarted = Date.now();
  try {
    return await withAbortableTimeout(
      async (signal) => {
        if (signal.aborted) {
          throw new AbortableTimeoutError('abort', label);
        }
        return fn();
      },
      RECONNECT_STEP_TIMEOUT_MS,
      undefined,
      {
        label,
        onTimeout: () =>
          logDriverNetwork('reconnect_timeout', {
            reason: label,
            durationMs: Date.now() - stepStarted,
          }),
      },
    );
  } catch (err) {
    if (err instanceof AbortableTimeoutError && err.reason === 'timeout') {
      throw new Error(`reconnect_step_timeout:${label}`);
    }
    throw err;
  }
}

function scheduleReconnectRetry(reason: string, startedAt: number): void {
  const delay = BACKOFF_MS[Math.min(backoffAttempt, BACKOFF_MS.length - 1)]!;
  backoffAttempt += 1;

  setPhase(
    typeof navigator !== 'undefined' && navigator.onLine ? 'reconnecting' : 'offline',
  );

  logDriverNetwork('reconnect_retry_scheduled', {
    reason,
    durationMs: Date.now() - startedAt,
    attempt: backoffAttempt,
  });

  clearBackoffTimer();
  backoffTimer = setTimeout(() => {
    backoffTimer = null;
    if (typeof navigator !== 'undefined' && navigator.onLine && coordinatorActive) {
      void runReconnectSequence();
    }
  }, delay);
}

function ensureReconnectRecovery(): void {
  if (!coordinatorActive) return;
  if (typeof navigator === 'undefined' || !navigator.onLine) return;
  if (currentState.phase !== 'reconnecting') return;
  if (reconnectInFlight) return;
  if (backoffTimer) return;

  logDriverNetwork('reconnect_retry_scheduled', {
    reason: 'recovery_ensure',
    attempt: backoffAttempt,
  });

  backoffTimer = setTimeout(() => {
    backoffTimer = null;
    void runReconnectSequence();
  }, 0);
}

function startReconnectWatchdog(): void {
  clearReconnectWatchdog();
  reconnectWatchdogTimer = setTimeout(() => {
    reconnectWatchdogTimer = null;
    if (currentState.phase !== 'reconnecting') return;
    if (typeof navigator === 'undefined' || !navigator.onLine) return;

    watchdogTriggerCount += 1;
    const elapsed = reconnectingSince != null ? Date.now() - reconnectingSince : 0;

    logDriverNetwork('reconnect_watchdog_triggered', {
      durationMs: elapsed,
      attempt: backoffAttempt,
      reason: `watchdog_${watchdogTriggerCount}`,
    });

    abortStaleReconnectWork('watchdog');
    clearReconnectInFlight('watchdog');
    clearBackoffTimer();

    if (watchdogTriggerCount >= MAX_WATCHDOG_ESCALATIONS) {
      logDriverNetwork('reconnect_force_online', {
        durationMs: elapsed,
        reason: 'watchdog_escalation',
      });
      backoffAttempt = 0;
      watchdogTriggerCount = 0;
      setPhase('online');
      notifyPollingResumed();
      return;
    }

    void runReconnectSequence();
  }, RECONNECT_WATCHDOG_MS);
}

async function runReconnectSequence(): Promise<void> {
  if (!coordinatorActive || !handlers) return;
  if (reconnectInFlight) return;

  reconnectInFlight = true;
  const startedAt = Date.now();

  logDriverNetwork('reconnect_started', { attempt: backoffAttempt });
  setPhase('reconnecting');

  const attemptPromise = (async () => {
    let currentStep: ReconnectForensicStep | null = null;
    try {
      abortStaleReconnectWork('reconnect_start');

      currentStep = 'reconnectRealtime';
      logReconnectForensic('step_start', { step: currentStep });
      await handlers!.reconnectRealtime();
      logReconnectForensic('step_done', { step: currentStep });

      currentStep = 'syncOfflineQueue';
      logReconnectForensic('step_start', { step: currentStep });
      await handlers!.syncOfflineQueue();
      logReconnectForensic('step_done', { step: currentStep });

      currentStep = 'refreshActiveDelivery';
      logReconnectForensic('step_start', {
        step: currentStep,
        refreshInFlight: getRefreshActiveDeliveryInFlight() !== null,
      });
      const hasActive = await handlers!.refreshActiveDelivery();
      logReconnectForensic('step_done', { step: currentStep, hasActive });

      if (!hasActive) {
        currentStep = 'refreshOrders';
        logReconnectForensic('step_start', { step: currentStep });
        await handlers!.refreshOrders();
        logReconnectForensic('step_done', { step: currentStep });
      }

      logReconnectForensic('reconnect_completed');
      backoffAttempt = 0;
      watchdogTriggerCount = 0;
      setPhase('online');
      logDriverNetwork('reconnect_completed', {
        durationMs: Date.now() - startedAt,
        attempt: 0,
      });
      notifyPollingResumed();
    } catch (err) {
      logReconnectForensic('reconnect_failed', {
        error: err,
        step: currentStep ?? undefined,
      });
      const reason = err instanceof Error ? err.message : 'reconnect_failed';
      logDriverNetwork('reconnect_failed', {
        durationMs: Date.now() - startedAt,
        reason,
      });
      abortStaleReconnectWork('reconnect_failed');
      scheduleReconnectRetry(reason, startedAt);
    } finally {
      reconnectInFlight = false;
      reconnectPromise = null;
      logDriverNetwork('reconnect_promise_cleared', { reason: 'attempt_finished' });
      ensureReconnectRecovery();
    }
  })();

  reconnectPromise = attemptPromise;
  await attemptPromise;
}

function handleBrowserOnline(): void {
  if (!coordinatorActive) return;

  // Idempotent: an attempt is already running.
  if (reconnectInFlight) return;

  // Already healthy.
  if (currentState.phase === 'online') return;

  // A backoff retry is already scheduled — do not cancel it (P0.2).
  if (currentState.phase === 'reconnecting' && backoffTimer !== null) return;

  void runReconnectSequence();
}

function handleBrowserOffline(): void {
  if (!coordinatorActive) return;
  clearBackoffTimer();
  clearReconnectWatchdog();
  abortStaleReconnectWork('offline');
  clearReconnectInFlight('offline');
  backoffAttempt = 0;
  watchdogTriggerCount = 0;
  setPhase('offline');
}

function handleVisibilityChange(): void {
  if (typeof document === 'undefined') return;
  const nextVisible = !document.hidden;
  if (currentState.isVisible === nextVisible) return;
  commitNetworkState({ ...currentState, isVisible: nextVisible });

  if (!coordinatorActive) return;

  if (!nextVisible) {
    logDriverNetwork('polling_paused', { reason: 'hidden' });
    return;
  }

  if (currentState.phase === 'online') {
    notifyPollingResumed();
  }
}

export function startDriverNetworkMonitoring(): void {
  if (typeof window === 'undefined' || monitoringStarted) return;
  monitoringStarted = true;

  commitNetworkState({
    phase: navigator.onLine ? 'online' : 'offline',
    isVisible: !document.hidden,
  });

  window.addEventListener('online', handleBrowserOnline);
  window.addEventListener('offline', handleBrowserOffline);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

export function stopDriverNetworkMonitoring(): void {
  if (!monitoringStarted || typeof window === 'undefined') return;
  monitoringStarted = false;

  window.removeEventListener('online', handleBrowserOnline);
  window.removeEventListener('offline', handleBrowserOffline);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  clearBackoffTimer();
  clearReconnectWatchdog();
  clearReconnectInFlight('monitoring_stopped');
}
