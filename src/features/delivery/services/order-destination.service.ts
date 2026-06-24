/**
 * Resolve order destination coordinates for map markers.
 * Sync: lat/lng → coords JSONB. Async: geocode address once with cache.
 */

import { googleMapsLoader } from '@/integrations/google-maps/loader';
import { orderCoordinates } from '@/shared/utils/order-fields';
import { isValidLatLng, normalizeCoordinates } from '@/shared/utils/coordinates';
import type { Coordinates } from '@/shared/types/common.types';

const GEOCODE_CACHE_KEY = 'juco_order_geocode_cache_v1';

type OrderForDestination = {
  id?: string;
  address?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  coords?: { lat?: number | string; lng?: number | string } | Coordinates | null;
};

const memoryCache = new Map<string, Coordinates>();

function readPersistentCache(): Record<string, Coordinates> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Coordinates>) : {};
  } catch {
    return {};
  }
}

function writePersistentCache(entry: Record<string, Coordinates>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // quota or private mode
  }
}

function cacheKey(order: OrderForDestination): string {
  if (order.id) return `order:${order.id}`;
  if (order.address) return `addr:${order.address.trim().toLowerCase()}`;
  return '';
}

export function resolveOrderDestinationSync(
  order: OrderForDestination | null | undefined
): Coordinates | null {
  return orderCoordinates(order);
}

export async function geocodeOrderAddressCached(
  order: OrderForDestination
): Promise<Coordinates | null> {
  const key = cacheKey(order);
  if (!key || !order.address?.trim()) return null;

  const fromMemory = memoryCache.get(key);
  if (isValidLatLng(fromMemory)) return fromMemory;

  const persisted = readPersistentCache();
  const fromStorage = persisted[key];
  if (isValidLatLng(fromStorage)) {
    memoryCache.set(key, fromStorage);
    return fromStorage;
  }

  await googleMapsLoader.load();

  if (!window.google?.maps?.Geocoder) {
    return null;
  }

  const geocoder = new google.maps.Geocoder();
  const response = await geocoder.geocode({ address: order.address.trim() });

  const location = response.results?.[0]?.geometry?.location;
  if (!location) return null;

  const coords = normalizeCoordinates({ lat: location.lat(), lng: location.lng() });
  if (!isValidLatLng(coords)) return null;

  memoryCache.set(key, coords);
  writePersistentCache({ ...persisted, [key]: coords });

  return coords;
}

export async function resolveOrderDestination(
  order: OrderForDestination | null | undefined
): Promise<Coordinates | null> {
  if (!order) return null;

  const sync = resolveOrderDestinationSync(order);
  if (isValidLatLng(sync)) {
    return sync;
  }

  if (!order.address?.trim()) return null;

  const geocoded = await geocodeOrderAddressCached(order);
  if (isValidLatLng(geocoded)) {
    return geocoded;
  }

  return null;
}
