/**
 * Client-safe GPS persistence via SECURITY DEFINER RPC (device login / anon client).
 * Never throws — failures queue for offline sync.
 */

import { supabase } from "@/integrations/supabase/client";
import { estimateJsonBytes, trackMapDataBytes } from "@/features/maps/debug/map-data-usage";
import { isUUID } from "@/shared/utils/uuid";
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

export type InsertDriverLocationResult = {
  success: boolean;
  error?: string;
  locationId?: string;
  queued?: boolean;
};

export type InsertDriverLocationOptions = {
  /** When true, failed inserts are not re-buffered (queue sync path). */
  suppressOfflineQueue?: boolean;
};

function formatDbError(error: { message?: string; details?: string; hint?: string }): string {
  return [error.message, error.details, error.hint].filter(Boolean).join(" — ") || "Database error";
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
  const assignmentId = payload.delivery_assignment_id;
  const driverId = payload.driver_id;

  if (!isUUID(assignmentId) || !isUUID(driverId)) {
    if (!options.suppressOfflineQueue) {
      await queueOfflineInsert(payload);
    }
    return {
      success: false,
      error: "Invalid assignment_id or driver_id UUID",
      queued: !options.suppressOfflineQueue,
    };
  }

  if (typeof payload.lat !== "number" || typeof payload.lng !== "number") {
    return { success: false, error: "lat and lng must be numbers" };
  }

  try {
    const rpcArgs = {
      p_assignment_id: assignmentId,
      p_driver_id: driverId,
      p_lat: payload.lat,
      p_lng: payload.lng,
      p_accuracy: payload.accuracy,
      p_speed: payload.speed,
      p_heading: payload.heading,
      p_recorded_at: payload.recorded_at,
    };
    trackMapDataBytes("gpsUpload", estimateJsonBytes(rpcArgs));

    const { data, error } = await supabase.rpc("insert_driver_gps_location", rpcArgs);

    if (error) {
      if (!options.suppressOfflineQueue) {
        await queueOfflineInsert(payload);
      }
      return { success: false, error: formatDbError(error), queued: !options.suppressOfflineQueue };
    }

    return { success: true, locationId: typeof data === "string" ? data : undefined };
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
