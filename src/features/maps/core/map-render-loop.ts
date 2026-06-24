/**
 * map-render-loop — RAF-based deterministic map render pipeline.
 *
 * One map instance, one RAF scheduler. Convergence gates only block the first paint;
 * subsequent driver GPS updates are throttled and applied incrementally in the renderer.
 */

import type { MapSnapshot, MapStage } from './map-snapshot.types';
import {
  applyCameraFromSnapshotFrame,
  detachStableCameraController,
  type CameraFrameContext,
  recordRenderCycle,
} from './stable-camera-controller';
import {
  commitFirstFrameLock,
  emptyConvergenceState,
  evaluateConvergenceGate,
  snapshotContentFingerprint,
  teardownConvergenceState,
  trackGpsStability,
  type ConvergenceGateReason,
  type ConvergenceRuntimeState,
} from './map-snapshot-convergence';
import { destroyMapSnapshotRenderer, renderMapFromSnapshot } from './render-map-from-snapshot';

/** Fallback if Google Maps idle/tilesloaded never fire. */
export const PROJECTION_FALLBACK_MS = 800;

/** Min interval between post-first-frame driver position paints. */
const DRIVER_RENDER_THROTTLE_MS = 250;

type RenderLoopState = {
  map: google.maps.Map;
  pendingSnapshot: MapSnapshot | null;
  lastEnqueuedSnapshot: MapSnapshot | null;
  lastRenderedFingerprint: string | null;
  cameraFrameCtx: CameraFrameContext;
  convergence: ConvergenceRuntimeState;
  rafId: number | null;
  frameCount: number;
  skippedFrames: number;
  skippedConvergence: number;
  lastSkipReason: ConvergenceGateReason | null;
  lastRenderAt: number | null;
  lastDriverRenderAt: number | null;
  projectionReady: boolean;
  projectionFallbackId: ReturnType<typeof setTimeout> | null;
  projectionIdleListener: google.maps.MapsEventListener | null;
  projectionTilesListener: google.maps.MapsEventListener | null;
};

const loops = new WeakMap<google.maps.Map, RenderLoopState>();

function emptyCameraFrameCtx(): CameraFrameContext {
  return {
    prevStage: undefined,
    projectionInitialized: false,
    pendingPickedUpFit: false,
  };
}

/** Full render fingerprint — includes projection for camera re-fit. */
export function snapshotRenderFingerprint(snapshot: MapSnapshot): string {
  return `${snapshotContentFingerprint(snapshot)}|proj:${snapshot.mapProjectionReady ? '1' : '0'}`;
}

function scheduleFrame(state: RenderLoopState): void {
  if (state.rafId != null) return;
  state.rafId = requestAnimationFrame(() => flushMapRenderLoop(state.map));
}

function markProjectionReady(state: RenderLoopState): void {
  if (state.projectionReady) return;
  state.projectionReady = true;

  if (!state.pendingSnapshot && state.lastEnqueuedSnapshot) {
    state.pendingSnapshot = state.lastEnqueuedSnapshot;
  }
  scheduleFrame(state);
}

function bootstrapProjection(map: google.maps.Map, state: RenderLoopState): void {
  const tryReady = (): void => markProjectionReady(state);

  state.projectionIdleListener = google.maps.event.addListenerOnce(map, 'idle', tryReady);
  state.projectionTilesListener = map.addListener('tilesloaded', () => {
    tryReady();
    if (state.projectionTilesListener) {
      google.maps.event.removeListener(state.projectionTilesListener);
      state.projectionTilesListener = null;
    }
  });

  state.projectionFallbackId = setTimeout(tryReady, PROJECTION_FALLBACK_MS);

  if (map.getProjection?.()) {
    tryReady();
  }

  google.maps.event.trigger(map, 'resize');
}

function teardownProjectionBootstrap(state: RenderLoopState): void {
  if (state.projectionFallbackId != null) {
    clearTimeout(state.projectionFallbackId);
    state.projectionFallbackId = null;
  }
  if (state.projectionIdleListener) {
    google.maps.event.removeListener(state.projectionIdleListener);
    state.projectionIdleListener = null;
  }
  if (state.projectionTilesListener) {
    google.maps.event.removeListener(state.projectionTilesListener);
    state.projectionTilesListener = null;
  }
}

function withLoopProjection(snapshot: MapSnapshot, projectionReady: boolean): MapSnapshot {
  if (snapshot.mapProjectionReady === projectionReady) return snapshot;
  return { ...snapshot, mapProjectionReady: projectionReady };
}

function isDriverOnlyUpdate(
  state: RenderLoopState,
  frameSnapshot: MapSnapshot,
  fingerprint: string
): boolean {
  if (!state.convergence.firstFrameCommitted || !state.lastRenderedFingerprint) {
    return false;
  }
  const base = snapshotContentFingerprint(frameSnapshot);
  const prevBase = state.lastRenderedFingerprint.replace(/\|proj:[01]$/, '');
  return base !== prevBase && fingerprint !== state.lastRenderedFingerprint;
}

function shouldThrottleDriverRender(state: RenderLoopState, frameSnapshot: MapSnapshot): boolean {
  if (!state.convergence.firstFrameCommitted) return false;
  if (!frameSnapshot.ui.showDriverMarker) return false;

  const now = performance.now();
  if (state.lastDriverRenderAt == null) return false;
  return now - state.lastDriverRenderAt < DRIVER_RENDER_THROTTLE_MS;
}

function flushMapRenderLoop(map: google.maps.Map): void {
  const state = loops.get(map);
  if (!state) return;

  state.rafId = null;

  const latest = state.pendingSnapshot ?? state.lastEnqueuedSnapshot;
  if (!latest) return;

  const frameSnapshot = withLoopProjection(
    structuredClone(latest) as MapSnapshot,
    state.projectionReady
  );
  const fingerprint = snapshotRenderFingerprint(frameSnapshot);

  if (
    state.convergence.firstFrameCommitted &&
    fingerprint === state.lastRenderedFingerprint
  ) {
    state.skippedFrames += 1;
    state.pendingSnapshot = null;
    return;
  }

  if (shouldThrottleDriverRender(state, frameSnapshot)) {
    state.lastSkipReason = 'duplicate';
    state.skippedFrames += 1;
    state.pendingSnapshot = latest;
    setTimeout(() => scheduleFrame(state), DRIVER_RENDER_THROTTLE_MS);
    return;
  }

  const gate = evaluateConvergenceGate(
    frameSnapshot,
    state.convergence,
    state.projectionReady,
    fingerprint,
    state.lastRenderedFingerprint
  );

  if (!gate.allow) {
    state.lastSkipReason = gate.reason;
    state.skippedConvergence += 1;
    state.pendingSnapshot = latest;

    if (gate.reason === 'first_frame_pending') {
      scheduleFrame(state);
    }
    return;
  }

  state.pendingSnapshot = null;
  state.lastSkipReason = null;
  state.cameraFrameCtx = applyCameraFromSnapshotFrame(map, frameSnapshot, state.cameraFrameCtx);
  renderMapFromSnapshot(map, frameSnapshot);
  recordRenderCycle(map);
  commitFirstFrameLock(state.convergence, frameSnapshot);

  state.lastRenderedFingerprint = fingerprint;
  state.frameCount += 1;
  state.lastRenderAt = performance.now();
  if (frameSnapshot.ui.showDriverMarker) {
    state.lastDriverRenderAt = state.lastRenderAt;
  }

  if (state.pendingSnapshot) scheduleFrame(state);
}

export function attachMapRenderLoop(map: google.maps.Map): void {
  if (loops.has(map)) return;

  const state: RenderLoopState = {
    map,
    pendingSnapshot: null,
    lastEnqueuedSnapshot: null,
    lastRenderedFingerprint: null,
    cameraFrameCtx: emptyCameraFrameCtx(),
    convergence: emptyConvergenceState(),
    rafId: null,
    frameCount: 0,
    skippedFrames: 0,
    skippedConvergence: 0,
    lastSkipReason: null,
    lastRenderAt: null,
    lastDriverRenderAt: null,
    projectionReady: false,
    projectionFallbackId: null,
    projectionIdleListener: null,
    projectionTilesListener: null,
  };

  loops.set(map, state);
  bootstrapProjection(map, state);
}

export function enqueueMapSnapshot(map: google.maps.Map, snapshot: MapSnapshot): void {
  const state = loops.get(map);
  if (!state) return;

  const contentFp = snapshotContentFingerprint(snapshot);
  if (
    contentFp === state.convergence.lastEnqueuedContentFingerprint &&
    state.convergence.firstFrameCommitted
  ) {
    return;
  }

  state.convergence.lastEnqueuedContentFingerprint = contentFp;
  state.lastEnqueuedSnapshot = snapshot;

  trackGpsStability(
    state.convergence,
    snapshot,
    () => {
      state.pendingSnapshot = state.lastEnqueuedSnapshot;
      scheduleFrame(state);
    },
    () => {
      state.lastRenderedFingerprint = null;
    }
  );

  state.pendingSnapshot = snapshot;
  scheduleFrame(state);
}

export function detachMapRenderLoop(map: google.maps.Map): void {
  const state = loops.get(map);
  if (!state) return;

  if (state.rafId != null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }

  teardownProjectionBootstrap(state);
  teardownConvergenceState(state.convergence);
  destroyMapSnapshotRenderer(map);
  detachStableCameraController(map);
  loops.delete(map);
}

export function getMapRenderLoopDebug(map: google.maps.Map): {
  frameCount: number;
  skippedFrames: number;
  skippedConvergence: number;
  lastSkipReason: ConvergenceGateReason | null;
  lastRenderAt: number | null;
  hasPending: boolean;
  prevStage: MapStage | undefined;
  projectionReady: boolean;
  firstFrameCommitted: boolean;
  gpsStabilizeReady: boolean;
} | null {
  const state = loops.get(map);
  if (!state) return null;
  return {
    frameCount: state.frameCount,
    skippedFrames: state.skippedFrames,
    skippedConvergence: state.skippedConvergence,
    lastSkipReason: state.lastSkipReason,
    lastRenderAt: state.lastRenderAt,
    hasPending: state.pendingSnapshot != null,
    prevStage: state.cameraFrameCtx.prevStage,
    projectionReady: state.projectionReady,
    firstFrameCommitted: state.convergence.firstFrameCommitted,
    gpsStabilizeReady: state.convergence.gpsStabilizeReady,
  };
}

export function isMapProjectionReady(map: google.maps.Map): boolean {
  return loops.get(map)?.projectionReady ?? false;
}
