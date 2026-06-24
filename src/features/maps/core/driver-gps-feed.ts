/**
 * Driver GPS feed — single pub/sub for map snapshot + ETA (replaces map Zustand store).
 */

import { normalizeMapPoint } from '@/features/maps/utils/normalize-coordinates';
import { appendTrailIfValid } from '@/features/maps/utils/trail';

export type DriverGpsCoords = { lat: number; lng: number };

export type DriverGpsPayload = {
  coords: DriverGpsCoords;
  heading: number;
  accuracy?: number;
  acceptForTrail: boolean;
  timestamp: number;
};

export type DriverGpsState = {
  driverPosition: DriverGpsCoords | null;
  driverHeading: number;
  trail: DriverGpsCoords[];
  gpsReady: boolean;
  lastGpsAt: number | null;
};

type GpsListener = (state: DriverGpsState) => void;

const initialState: DriverGpsState = {
  driverPosition: null,
  driverHeading: 0,
  trail: [],
  gpsReady: false,
  lastGpsAt: null,
};

let state: DriverGpsState = { ...initialState };
const listeners = new Set<GpsListener>();
let trailEligible = false;

function notify(): void {
  listeners.forEach((fn) => fn(state));
}

export function subscribeDriverGps(listener: GpsListener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function getDriverGpsState(): DriverGpsState {
  return state;
}

export function setDriverTrailEligible(eligible: boolean): void {
  trailEligible = eligible;
  if (!eligible) {
    state = { ...state, trail: [] };
    notify();
  }
}

export function resetDriverGpsState(): void {
  state = { ...initialState };
  trailEligible = false;
  notify();
}

export function pushDriverGpsToMapStore(
  coords: DriverGpsCoords,
  heading = 0,
  accuracy?: number,
  acceptForTrail = false
): void {
  const normalized = normalizeMapPoint(coords);
  if (!normalized) return;

  const shouldTrail = trailEligible && acceptForTrail;
  const trail = shouldTrail
    ? appendTrailIfValid(state.trail, normalized, accuracy)
    : state.trail;

  state = {
    driverPosition: normalized,
    driverHeading: heading,
    trail,
    gpsReady: true,
    lastGpsAt: Date.now(),
  };
  notify();
}
