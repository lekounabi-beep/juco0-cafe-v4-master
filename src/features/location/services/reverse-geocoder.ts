import type { AddressSearchResult } from "../types/address";
import { reverseSearchAddress } from "./mapbox-search";

export async function reverseGeocodeAddress(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<AddressSearchResult | null> {
  return reverseSearchAddress(lat, lng, signal);
}
