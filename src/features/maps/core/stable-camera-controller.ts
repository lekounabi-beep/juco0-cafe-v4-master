/**
 * StableCameraController — fitBounds once per stage; user interaction locks camera.
 */

import { googleMapsConfig } from '@/integrations/google-maps/config';
import type { MapSnapshot, MapStage } from './map-snapshot.types';

export enum CameraEvent {
  DELIVERY_ASSIGNED_ONCE = 'DELIVERY_ASSIGNED_ONCE',
  DELIVERY_PICKED_UP_ONCE = 'DELIVERY_PICKED_UP_ONCE',
  DELIVERY_COMPLETED_RESET = 'DELIVERY_COMPLETED_RESET',
  DEFAULT_CITY_ONCE = 'DEFAULT_CITY_ONCE',
}

type CameraLock = {
  assigned: boolean;
  pickedUp: boolean;
  all: boolean;
};

type CameraState = {
  lock: CameraLock;
  lastCameraEvent: CameraEvent | null;
  lastFitReason: string | null;
  renderCycleCount: number;
  isUserControllingMap: boolean;
  isProgrammaticCamera: boolean;
  listeners: google.maps.MapsEventListener[];
  defaultCityApplied: boolean;
};

const cameraStates = new WeakMap<google.maps.Map, CameraState>();
const FIT_PADDING = 56;

function emptyState(): CameraState {
  return {
    lock: { assigned: false, pickedUp: false, all: false },
    lastCameraEvent: null,
    lastFitReason: null,
    renderCycleCount: 0,
    isUserControllingMap: false,
    isProgrammaticCamera: false,
    listeners: [],
    defaultCityApplied: false,
  };
}

function getState(map: google.maps.Map): CameraState {
  let state = cameraStates.get(map);
  if (!state) {
    state = emptyState();
    cameraStates.set(map, state);
  }
  return state;
}

function lockAllCamera(map: google.maps.Map): void {
  const state = getState(map);
  if (state.isProgrammaticCamera) return;
  state.lock.all = true;
  state.isUserControllingMap = true;
}

function fitPoints(
  map: google.maps.Map,
  points: { lat: number; lng: number }[],
  event: CameraEvent,
  reason: string,
  lockKey: keyof Pick<CameraLock, 'assigned' | 'pickedUp'> | 'defaultCityApplied'
): boolean {
  const state = getState(map);
  if (state.lock.all || points.length === 0) return false;
  if (lockKey === 'assigned' && state.lock.assigned) return false;
  if (lockKey === 'pickedUp' && state.lock.pickedUp) return false;
  if (lockKey === 'defaultCityApplied' && state.defaultCityApplied) return false;

  const bounds = new google.maps.LatLngBounds();
  points.forEach((p) => bounds.extend(p));

  state.isProgrammaticCamera = true;
  map.fitBounds(bounds, FIT_PADDING);

  google.maps.event.addListenerOnce(map, 'idle', () => {
    state.isProgrammaticCamera = false;
  });

  if (lockKey === 'assigned') state.lock.assigned = true;
  if (lockKey === 'pickedUp') state.lock.pickedUp = true;
  if (lockKey === 'defaultCityApplied') state.defaultCityApplied = true;

  state.lastCameraEvent = event;
  state.lastFitReason = reason;
  return true;
}

function defaultCity(map: google.maps.Map, reason: string): boolean {
  const state = getState(map);
  if (state.lock.all || state.defaultCityApplied) return false;

  state.isProgrammaticCamera = true;
  map.setCenter(googleMapsConfig.defaultCenter);
  map.setZoom(googleMapsConfig.defaultZoom);

  google.maps.event.addListenerOnce(map, 'idle', () => {
    state.isProgrammaticCamera = false;
  });

  state.defaultCityApplied = true;
  state.lastCameraEvent = CameraEvent.DEFAULT_CITY_ONCE;
  state.lastFitReason = reason;
  return true;
}

function isPostPickup(stage: MapStage): boolean {
  return stage === 'picked_up' || stage === 'in_transit' || stage === 'arrived';
}

export type CameraFrameContext = {
  prevStage: MapStage | undefined;
  projectionInitialized: boolean;
  pendingPickedUpFit: boolean;
};

function applyInitialCamera(map: google.maps.Map, snapshot: MapSnapshot): void {
  const state = getState(map);
  state.isProgrammaticCamera = true;

  if (snapshot.stage === 'assigned' && snapshot.camera.assignedFitPoints.length > 0) {
    fitPoints(
      map,
      snapshot.camera.assignedFitPoints,
      CameraEvent.DELIVERY_ASSIGNED_ONCE,
      'initial:assigned',
      'assigned'
    );
  } else if (isPostPickup(snapshot.stage) && snapshot.camera.pickedUpFitPoints.length > 0) {
    fitPoints(
      map,
      snapshot.camera.pickedUpFitPoints,
      CameraEvent.DELIVERY_PICKED_UP_ONCE,
      'initial:post-pickup',
      'pickedUp'
    );
  } else if (snapshot.camera.defaultCity) {
    defaultCity(map, 'initial:no-delivery');
  }

  google.maps.event.addListenerOnce(map, 'idle', () => {
    state.isProgrammaticCamera = false;
    attachUserListeners(map);
  });
}

function applyStageTransitionCamera(
  map: google.maps.Map,
  prevStage: MapStage | undefined,
  snapshot: MapSnapshot
): void {
  const nextStage = snapshot.stage;
  if (prevStage === nextStage) return;

  if (nextStage === 'idle' && prevStage && prevStage !== 'idle') {
    resetStableCamera(map, 'stage:delivered');
    return;
  }

  if (nextStage === 'assigned' && prevStage !== 'assigned') {
    fitPoints(
      map,
      snapshot.camera.assignedFitPoints,
      CameraEvent.DELIVERY_ASSIGNED_ONCE,
      'transition:assigned',
      'assigned'
    );
    return;
  }

  if (nextStage === 'picked_up' && prevStage !== 'picked_up' && !isPostPickup(prevStage ?? 'idle')) {
    fitPoints(
      map,
      snapshot.camera.pickedUpFitPoints,
      CameraEvent.DELIVERY_PICKED_UP_ONCE,
      'transition:picked_up',
      'pickedUp'
    );
  }
}

/**
 * Apply camera framing from snapshot inside the render loop (never from React).
 */
export function applyCameraFromSnapshotFrame(
  map: google.maps.Map,
  snapshot: MapSnapshot,
  frameCtx: CameraFrameContext
): CameraFrameContext {
  if (!snapshot.mapProjectionReady) return frameCtx;

  const next: CameraFrameContext = { ...frameCtx };

  if (!next.projectionInitialized) {
    applyInitialCamera(map, snapshot);
    next.projectionInitialized = true;
    next.prevStage = snapshot.stage;
    if (
      snapshot.stage === 'picked_up' ||
      snapshot.stage === 'in_transit' ||
      snapshot.stage === 'arrived'
    ) {
      const cam = getState(map);
      next.pendingPickedUpFit = !cam.lock.pickedUp;
    }
    return next;
  }

  if (next.prevStage !== snapshot.stage) {
    applyStageTransitionCamera(map, next.prevStage, snapshot);
    if (snapshot.stage === 'picked_up') {
      const cam = getState(map);
      next.pendingPickedUpFit = !cam.lock.pickedUp;
    }
    next.prevStage = snapshot.stage;
  }

  if (snapshot.stage === 'assigned' && snapshot.camera.assignedFitPoints.length >= 2) {
    fitPoints(
      map,
      snapshot.camera.assignedFitPoints,
      CameraEvent.DELIVERY_ASSIGNED_ONCE,
      'destination:ready',
      'assigned'
    );
  }

  if (next.pendingPickedUpFit && snapshot.camera.pickedUpFitPoints.length >= 2) {
    const applied = fitPoints(
      map,
      snapshot.camera.pickedUpFitPoints,
      CameraEvent.DELIVERY_PICKED_UP_ONCE,
      'driver:ready',
      'pickedUp'
    );
    if (applied) next.pendingPickedUpFit = false;
  }

  return next;
}

function attachUserListeners(map: google.maps.Map): void {
  const state = getState(map);
  if (state.listeners.length > 0) return;
  state.listeners.push(
    map.addListener('dragstart', () => lockAllCamera(map)),
    map.addListener('zoom_changed', () => lockAllCamera(map))
  );
}

export function detachStableCameraController(map: google.maps.Map): void {
  const state = cameraStates.get(map);
  if (!state) return;
  state.listeners.forEach((l) => google.maps.event.removeListener(l));
  cameraStates.delete(map);
}

export function resetStableCamera(map: google.maps.Map, reason: string): void {
  const state = getState(map);
  state.lock.assigned = false;
  state.lock.pickedUp = false;
  state.defaultCityApplied = false;
  state.lastCameraEvent = CameraEvent.DELIVERY_COMPLETED_RESET;
  state.lastFitReason = reason;
  if (!state.lock.all) {
    defaultCity(map, reason);
  }
}

export function recordRenderCycle(map: google.maps.Map): void {
  getState(map).renderCycleCount += 1;
}

export function getStableCameraDebug(map: google.maps.Map) {
  const state = getState(map);
  return {
    cameraLockState: { ...state.lock },
    lastCameraEvent: state.lastCameraEvent,
    lastFitReason: state.lastFitReason,
    renderCycleCount: state.renderCycleCount,
    isUserControllingMap: state.isUserControllingMap,
  };
}
