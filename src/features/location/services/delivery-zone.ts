import { storeLocation } from "@/config/map-defaults";
import type { CheckoutAddress, DeliveryZoneResult } from "../types/address";
import { isValidCheckoutAddress } from "./address-parser";

export const MAX_DELIVERY_DISTANCE_KM = 4.5;

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

export function validateDeliveryZoneByCoordinates(lat: number, lng: number): DeliveryZoneResult {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return {
      isAvailable: false,
      message: "Η διεύθυνση δεν είναι έγκυρη.",
    };
  }

  const distance = distanceKm(storeLocation, { lat, lng });
  if (distance > MAX_DELIVERY_DISTANCE_KM) {
    return {
      isAvailable: false,
      message: "Η διεύθυνση βρίσκεται εκτός περιοχής εξυπηρέτησης.",
      distanceKm: distance,
    };
  }

  return {
    isAvailable: true,
    message: "Η περιοχή εξυπηρετείται.",
    distanceKm: distance,
  };
}

export async function validateDeliveryZone(address: CheckoutAddress): Promise<DeliveryZoneResult> {
  if (!isValidCheckoutAddress(address)) {
    return {
      isAvailable: false,
      message: "Η διεύθυνση δεν είναι έγκυρη.",
    };
  }

  return validateDeliveryZoneByCoordinates(address.lat, address.lng);
}
