/**
 * Driver location insert — validated server-side via authenticated driver session.
 */

import { isUUID } from "@/shared/utils/uuid";
import { normalizeCoordinates } from "@/shared/utils/coordinates";
import { insertDriverLocationServer } from "../../../../app/actions/driver-gps";
import type { GPSLocationUpdate } from "../types/delivery.types";

export type DriverLocationInsertPayload = {
  delivery_assignment_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
};

export type InsertDriverLocationOptions = {
  suppressOfflineQueue?: boolean;
};

export type InsertDriverLocationResult = {
  success: boolean;
  error?: string;
  locationId?: string;
  queued?: boolean;
};

export type RecordDriverLocationResult = {
  success: boolean;
  error?: string;
  payload?: DriverLocationInsertPayload;
};

export function validateDriverLocationPayload(
  assignmentId: string,
  driverId: string,
  location: GPSLocationUpdate,
): { valid: true; payload: DriverLocationInsertPayload } | { valid: false; error: string } {
  if (!assignmentId || !driverId) {
    return { valid: false, error: "assignment_id and driver_id are required" };
  }

  if (!isUUID(assignmentId)) {
    return { valid: false, error: `Invalid assignment_id UUID: ${assignmentId}` };
  }

  if (!isUUID(driverId)) {
    return { valid: false, error: `Invalid driver_id UUID: ${driverId}` };
  }

  const coords = normalizeCoordinates({ lat: location.lat, lng: location.lng });
  if (!coords) {
    return { valid: false, error: "Invalid lat/lng coordinates" };
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

async function queueOfflineInsert(payload: DriverLocationInsertPayload): Promise<void> {
  try {
    const { addOfflineGpsPoint } = await import("./offline-queue.service");
    const point: GPSLocationUpdate = {
      lat: payload.lat,
      lng: payload.lng,
      accuracy: payload.accuracy,
      speed: payload.speed,
      heading: payload.heading,
      timestamp: payload.recorded_at,
    };
    addOfflineGpsPoint(payload.delivery_assignment_id, payload.driver_id, point);
  } catch {
    // offline queue unavailable
  }
}

export async function insertDriverLocation(
  payload: DriverLocationInsertPayload,
  options: InsertDriverLocationOptions = {},
): Promise<InsertDriverLocationResult> {
  try {
    const result = await insertDriverLocationServer(payload);

    if (!result.success) {
      if (!options.suppressOfflineQueue) {
        await queueOfflineInsert(payload);
      }
      return { success: false, error: result.error, queued: !options.suppressOfflineQueue };
    }

    return { success: true, locationId: result.locationId };
  } catch (error) {
    if (!options.suppressOfflineQueue) {
      await queueOfflineInsert(payload);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown GPS insert error",
      queued: !options.suppressOfflineQueue,
    };
  }
}

export async function recordDriverLocationSafe(
  assignmentId: string,
  driverId: string,
  location: GPSLocationUpdate,
  options: InsertDriverLocationOptions = {},
): Promise<RecordDriverLocationResult> {
  const validated = validateDriverLocationPayload(assignmentId, driverId, location);
  if (!validated.valid) {
    return { success: false, error: validated.error };
  }

  const { payload } = validated;
  const result = await insertDriverLocation(payload, options);

  if (!result.success) {
    return { success: false, error: result.error, payload };
  }

  return { success: true, payload };
}

export function localPositionFromGpsUpdate(
  location: GPSLocationUpdate,
): { lat: number; lng: number } | null {
  return normalizeCoordinates({ lat: location.lat, lng: location.lng });
}

export function localPositionFromPayload(payload: DriverLocationInsertPayload): {
  lat: number;
  lng: number;
} {
  return { lat: payload.lat, lng: payload.lng };
}
