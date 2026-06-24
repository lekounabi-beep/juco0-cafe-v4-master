/**
 * In-memory GPS trail — no Supabase persistence.
 */

import { calculateDistance } from '@/features/delivery/services/distance.service';
import type { MapPoint } from './normalize-coordinates';

export const MAX_TRAIL_POINTS = 300;
export const MIN_TRAIL_MOVE_METERS = 3;
export const MAX_TRAIL_ACCURACY_METERS = 40;

export function shouldAppendTrailPoint(
  trail: MapPoint[],
  point: MapPoint,
  accuracy?: number
): boolean {
  if (accuracy != null && Number.isFinite(accuracy) && accuracy > MAX_TRAIL_ACCURACY_METERS) {
    return false;
  }

  const last = trail[trail.length - 1];
  if (!last) return true;

  return calculateDistance(last, point) >= MIN_TRAIL_MOVE_METERS;
}

export function appendTrailPoint(trail: MapPoint[], point: MapPoint): MapPoint[] {
  const next = [...trail, point];
  if (next.length <= MAX_TRAIL_POINTS) {
    return next;
  }
  return next.slice(next.length - MAX_TRAIL_POINTS);
}

export function appendTrailIfValid(
  trail: MapPoint[],
  point: MapPoint,
  accuracy?: number
): MapPoint[] {
  if (!shouldAppendTrailPoint(trail, point, accuracy)) {
    return trail;
  }
  return appendTrailPoint(trail, point);
}
