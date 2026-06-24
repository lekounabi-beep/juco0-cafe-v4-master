/**
 * Snapshot convergence — coherence + GPS stabilization gates before first paint.
 */

import { hasMapCoords } from '../utils/normalize-coordinates';
import type { MapSnapshot, MapStage } from './map-snapshot.types';

/** Wait for GPS to settle before first driver-marker render (300–500ms window). */
export const GPS_STABILIZE_MS = 400;

export type ConvergenceGateReason =
  | 'ok'
  | 'incoherent'
  | 'gps_stabilizing'
  | 'projection_pending'
  | 'duplicate'
  | 'first_frame_pending';

export type ConvergenceGateResult = {
  allow: boolean;
  reason: ConvergenceGateReason;
};

function isPostPickup(stage: MapStage): boolean {
  return stage === 'picked_up' || stage === 'in_transit' || stage === 'arrived';
}

/** Stage + destination (+ store / driver) must agree before any render. */
export function isSnapshotCoherent(snapshot: MapSnapshot): boolean {
  const { stage, destination, store, driver, ui } = snapshot;

  if (stage === 'idle' || stage === 'delivered') {
    return true;
  }

  if (ui.showDestinationMarker && !hasMapCoords(destination)) {
    return false;
  }

  if (stage === 'assigned') {
    if (ui.showStoreMarker && !hasMapCoords(store)) {
      return false;
    }
    return true;
  }

  if (isPostPickup(stage)) {
    if (ui.showDriverMarker && !hasMapCoords(driver)) {
      return false;
    }
    return true;
  }

  return true;
}

/** Post-pickup driver marker requires GPS stabilization window. */
export function needsGpsStabilization(snapshot: MapSnapshot): boolean {
  if (!snapshot.ui.showDriverMarker) return false;
  return isPostPickup(snapshot.stage);
}

function serializePoints(points: { lat: number; lng: number }[]): string {
  return points.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join(';');
}

/** Content fingerprint for enqueue dedupe + post-first-frame updates. */
export function snapshotContentFingerprint(snapshot: MapSnapshot): string {
  const lastRoute = snapshot.routePoints[snapshot.routePoints.length - 1];
  return [
    snapshot.stage,
    snapshot.driver.lat,
    snapshot.driver.lng,
    snapshot.driver.heading ?? 0,
    snapshot.destination.lat,
    snapshot.destination.lng,
    snapshot.store.lat,
    snapshot.store.lng,
    snapshot.ui.showDriverMarker ? '1' : '0',
    snapshot.ui.showDestinationMarker ? '1' : '0',
    snapshot.ui.showStoreMarker ? '1' : '0',
    snapshot.ui.showRoute ? '1' : '0',
    snapshot.routePoints.length,
    lastRoute ? `${lastRoute.lat.toFixed(6)},${lastRoute.lng.toFixed(6)}` : '',
    serializePoints(snapshot.camera.assignedFitPoints),
    serializePoints(snapshot.camera.pickedUpFitPoints),
    snapshot.camera.defaultCity ? '1' : '0',
  ].join('|');
}

/**
 * First-frame lock fingerprint — excludes live driver GPS on assigned stage
 * so moving driver does not block the initial paint forever.
 */
export function convergenceLockFingerprint(snapshot: MapSnapshot): string {
  const parts = [
    snapshot.stage,
    snapshot.destination.lat,
    snapshot.destination.lng,
    snapshot.store.lat,
    snapshot.store.lng,
    snapshot.ui.showDestinationMarker ? '1' : '0',
    snapshot.ui.showStoreMarker ? '1' : '0',
    snapshot.ui.showRoute ? '1' : '0',
  ];

  if (isPostPickup(snapshot.stage)) {
    parts.push(
      snapshot.driver.lat,
      snapshot.driver.lng,
      snapshot.ui.showDriverMarker ? '1' : '0'
    );
  }

  return parts.join('|');
}

export type ConvergenceRuntimeState = {
  trackedStage: MapStage | null;
  gpsFirstSeenAt: number | null;
  gpsStabilizeReady: boolean;
  gpsStabilizeTimerId: ReturnType<typeof setTimeout> | null;
  firstFrameCommitted: boolean;
  firstFrameLock: MapSnapshot | null;
  firstFrameLockFingerprint: string | null;
  lastEnqueuedContentFingerprint: string | null;
};

export function emptyConvergenceState(): ConvergenceRuntimeState {
  return {
    trackedStage: null,
    gpsFirstSeenAt: null,
    gpsStabilizeReady: true,
    gpsStabilizeTimerId: null,
    firstFrameCommitted: false,
    firstFrameLock: null,
    firstFrameLockFingerprint: null,
    lastEnqueuedContentFingerprint: null,
  };
}

export function clearGpsStabilizeTimer(state: ConvergenceRuntimeState): void {
  if (state.gpsStabilizeTimerId != null) {
    clearTimeout(state.gpsStabilizeTimerId);
    state.gpsStabilizeTimerId = null;
  }
}

export function resetGpsStability(state: ConvergenceRuntimeState): void {
  clearGpsStabilizeTimer(state);
  state.gpsFirstSeenAt = null;
  state.gpsStabilizeReady = true;
}

function resetFirstFrameLock(state: ConvergenceRuntimeState): void {
  state.firstFrameCommitted = false;
  state.firstFrameLock = null;
  state.firstFrameLockFingerprint = null;
}

export function onConvergenceStageChange(
  state: ConvergenceRuntimeState,
  stage: MapStage,
  onStageChange?: () => void
): void {
  if (state.trackedStage === stage) return;
  state.trackedStage = stage;
  resetGpsStability(state);
  resetFirstFrameLock(state);
  onStageChange?.();
}

export type GpsStabilitySchedule = () => void;

export function trackGpsStability(
  state: ConvergenceRuntimeState,
  snapshot: MapSnapshot,
  onStabilized: GpsStabilitySchedule,
  onStageChange?: () => void
): void {
  onConvergenceStageChange(state, snapshot.stage, onStageChange);

  if (!needsGpsStabilization(snapshot)) {
    state.gpsStabilizeReady = true;
    return;
  }

  if (!hasMapCoords(snapshot.driver)) {
    resetGpsStability(state);
    state.gpsStabilizeReady = false;
    return;
  }

  const now = performance.now();

  if (state.gpsFirstSeenAt == null) {
    state.gpsFirstSeenAt = now;
    state.gpsStabilizeReady = false;
    clearGpsStabilizeTimer(state);
    state.gpsStabilizeTimerId = setTimeout(() => {
      state.gpsStabilizeReady = true;
      state.gpsStabilizeTimerId = null;
      onStabilized();
    }, GPS_STABILIZE_MS);
    return;
  }

  if (now - state.gpsFirstSeenAt >= GPS_STABILIZE_MS) {
    state.gpsStabilizeReady = true;
  }
}

export function evaluateConvergenceGate(
  snapshot: MapSnapshot,
  convergence: ConvergenceRuntimeState,
  projectionReady: boolean,
  renderFingerprint: string,
  lastRenderedFingerprint: string | null
): ConvergenceGateResult {
  if (renderFingerprint === lastRenderedFingerprint) {
    return { allow: false, reason: 'duplicate' };
  }

  if (!isSnapshotCoherent(snapshot)) {
    return { allow: false, reason: 'incoherent' };
  }

  if (needsGpsStabilization(snapshot) && !convergence.gpsStabilizeReady) {
    return { allow: false, reason: 'gps_stabilizing' };
  }

  if (!convergence.firstFrameCommitted && !projectionReady) {
    return { allow: false, reason: 'projection_pending' };
  }

  if (!convergence.firstFrameCommitted && !isFirstFrameLockStable(convergence, snapshot)) {
    return { allow: false, reason: 'first_frame_pending' };
  }

  return { allow: true, reason: 'ok' };
}

export function isFirstFrameLockStable(
  convergence: ConvergenceRuntimeState,
  snapshot: MapSnapshot
): boolean {
  if (convergence.firstFrameCommitted) return true;

  const fp = convergenceLockFingerprint(snapshot);

  if (convergence.firstFrameLock == null) {
    convergence.firstFrameLock = structuredClone(snapshot) as MapSnapshot;
    convergence.firstFrameLockFingerprint = fp;
    return false;
  }

  if (convergence.firstFrameLockFingerprint !== fp) {
    convergence.firstFrameLock = structuredClone(snapshot) as MapSnapshot;
    convergence.firstFrameLockFingerprint = fp;
    return false;
  }

  return true;
}

export function commitFirstFrameLock(
  convergence: ConvergenceRuntimeState,
  frameSnapshot: MapSnapshot
): void {
  if (convergence.firstFrameCommitted) return;
  convergence.firstFrameCommitted = true;
  convergence.firstFrameLock = structuredClone(frameSnapshot) as MapSnapshot;
}

export function teardownConvergenceState(state: ConvergenceRuntimeState): void {
  clearGpsStabilizeTimer(state);
  resetFirstFrameLock(state);
  state.trackedStage = null;
  state.lastEnqueuedContentFingerprint = null;
}
