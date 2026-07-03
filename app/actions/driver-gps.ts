"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isUUID } from "@/shared/utils/uuid";
import { requireDriverSession } from "./driver-login";
import { serverLog } from "@/lib/server/logger";

export type InsertDriverLocationInput = {
  delivery_assignment_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
};

export async function insertDriverLocationServer(
  payload: InsertDriverLocationInput,
): Promise<{ success: boolean; error?: string; locationId?: string }> {
  const session = await requireDriverSession();

  if (session.driverId !== payload.driver_id) {
    serverLog.warn("driver.assignment.failed", {
      reason: "gps_driver_mismatch",
      sessionDriverId: session.driverId,
    });
    return { success: false, error: "Unauthorized" };
  }

  if (!isUUID(payload.delivery_assignment_id)) {
    return { success: false, error: "Invalid assignment_id" };
  }

  const { data, error } = await supabaseAdmin.rpc("insert_driver_gps_location", {
    p_assignment_id: payload.delivery_assignment_id,
    p_driver_id: payload.driver_id,
    p_lat: payload.lat,
    p_lng: payload.lng,
    p_accuracy: payload.accuracy,
    p_speed: payload.speed,
    p_heading: payload.heading,
    p_recorded_at: payload.recorded_at,
  });

  if (error) {
    serverLog.warn("driver.gps.failed", { driverId: payload.driver_id, error: error.message });
    return { success: false, error: "Could not record GPS location." };
  }

  return {
    success: true,
    locationId: typeof data === "string" ? data : undefined,
  };
}
