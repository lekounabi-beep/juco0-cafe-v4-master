"use server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isUUID } from "@/shared/utils/uuid";
import type { DriverAvailability } from "@/features/delivery/types/delivery.types";
import { requireDriverSession } from "./driver-login";
import { serverLog } from "@/lib/server/logger";

const DRIVERS_TABLE = "drivers" as never;

type Coordinates = { lat: number; lng: number };

export async function updateDriverAvailabilityServer(
  driverId: string,
  availabilityStatus: DriverAvailability,
  currentLocation?: Coordinates,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireDriverSession().catch(() => null);
  if (!session || session.driverId !== driverId) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isUUID(driverId)) {
    return { success: false, error: "Invalid driver_id: UUID required" };
  }

  const updatePayload: Record<string, unknown> = {
    availability_status: availabilityStatus,
    updated_at: new Date().toISOString(),
  };

  if (currentLocation) {
    updatePayload.current_location_lat = currentLocation.lat;
    updatePayload.current_location_lng = currentLocation.lng;
    updatePayload.last_location_update = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from(DRIVERS_TABLE)
    .update(updatePayload as never)
    .eq("id", driverId);

  if (error) {
    serverLog.warn("driver.availability.failed", { driverId, error: error.message });
    return { success: false, error: "Could not update availability. Please try again." };
  }

  return { success: true };
}
