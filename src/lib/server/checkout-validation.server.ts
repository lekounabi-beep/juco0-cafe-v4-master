/**
 * Server-side checkout guards — never trust client-only validation.
 */

import { validateDeliveryZoneByCoordinates } from "@/features/location/services/delivery-zone";
import { serverLog } from "@/lib/server/logger";

export function assertCheckoutDeliveryAllowed(input: {
  fulfillment: "pickup" | "delivery";
  address: string;
  lat?: number | null;
  lng?: number | null;
}): void {
  if (input.fulfillment !== "delivery") {
    return;
  }

  if (!input.address?.trim()) {
    serverLog.warn("order.rejected", { reason: "missing_delivery_address" });
    throw new Error("Επιλέξτε διεύθυνση παράδοσης.");
  }

  const lat = input.lat;
  const lng = input.lng;

  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    serverLog.warn("order.rejected", { reason: "missing_delivery_coordinates" });
    throw new Error("Η διεύθυνση παράδοσης δεν είναι έγκυρη.");
  }

  const zone = validateDeliveryZoneByCoordinates(lat, lng);
  if (!zone.isAvailable) {
    serverLog.warn("order.rejected", {
      reason: "delivery_zone_rejected",
      distanceKm: zone.distanceKm,
    });
    throw new Error(zone.message);
  }
}
