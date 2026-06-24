/**
 * Driver location insert — strict validation + client Supabase repository.
 * MUST NOT import from app/actions (see gps-repository.ts).
 */

import { isUUID } from '@/shared/utils/uuid';
import { normalizeCoordinates } from '@/shared/utils/coordinates';
import {
  insertDriverLocation,
  type DriverLocationInsertPayload,
  type InsertDriverLocationOptions,
} from './gps-repository';
import type { GPSLocationUpdate } from '../types/delivery.types';

export type { DriverLocationInsertPayload };

export type RecordDriverLocationResult = {
  success: boolean;
  error?: string;
  payload?: DriverLocationInsertPayload;
};

export function validateDriverLocationPayload(
  assignmentId: string,
  driverId: string,
  location: GPSLocationUpdate
): { valid: true; payload: DriverLocationInsertPayload } | { valid: false; error: string } {
  if (!assignmentId || !driverId) {
    return { valid: false, error: 'assignment_id and driver_id are required' };
  }

  if (!isUUID(assignmentId)) {
    return { valid: false, error: `Invalid assignment_id UUID: ${assignmentId}` };
  }

  if (!isUUID(driverId)) {
    return { valid: false, error: `Invalid driver_id UUID: ${driverId}` };
  }

  const coords = normalizeCoordinates({ lat: location.lat, lng: location.lng });
  if (!coords) {
    return { valid: false, error: 'Invalid lat/lng coordinates' };
  }

  const timestamp = location.timestamp ?? new Date().toISOString();

  return {
    valid: true,
    payload: {
      delivery_assignment_id: assignmentId,
      driver_id: driverId,
      lat: coords.lat,
      lng: coords.lng,
      accuracy: location.accuracy ?? null,
      speed: location.speed ?? null,
      heading: location.heading ?? null,
      recorded_at: timestamp,
    },
  };
}

export async function recordDriverLocationSafe(
  assignmentId: string,
  driverId: string,
  location: GPSLocationUpdate,
  options: InsertDriverLocationOptions = {}
): Promise<RecordDriverLocationResult> {
  const validated = validateDriverLocationPayload(assignmentId, driverId, location);
  if (!validated.valid) {
    return { success: false, error: validated.error };
  }

  const { payload } = validated;

  try {
    const result = await insertDriverLocation(payload, options);

    if (!result.success) {
      return { success: false, error: result.error, payload };
    }

    return { success: true, payload };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown GPS insert error',
      payload,
    };
  }
}

/** Local position fallback when DB insert fails — keeps map marker alive. */
export function localPositionFromGpsUpdate(
  location: GPSLocationUpdate
): { lat: number; lng: number } | null {
  return normalizeCoordinates({ lat: location.lat, lng: location.lng });
}

export function localPositionFromPayload(
  payload: DriverLocationInsertPayload
): { lat: number; lng: number } {
  return { lat: payload.lat, lng: payload.lng };
}
