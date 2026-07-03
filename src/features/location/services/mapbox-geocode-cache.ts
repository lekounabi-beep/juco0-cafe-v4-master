import type { AddressSearchResult } from "../types/address";

const CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const forwardCache = new Map<string, CacheEntry<AddressSearchResult[]>>();
const reverseCache = new Map<string, CacheEntry<AddressSearchResult | null>>();

export function forwardGeocodeCacheKey(query: string): string {
  return query.toLowerCase().trim();
}

export function reverseGeocodeCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function readCache<T>(store: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }

  return entry.value;
}

function writeCache<T>(store: Map<string, CacheEntry<T>>, key: string, value: T): void {
  store.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function getCachedForwardGeocode(query: string): AddressSearchResult[] | undefined {
  return readCache(forwardCache, forwardGeocodeCacheKey(query));
}

export function setCachedForwardGeocode(query: string, results: AddressSearchResult[]): void {
  writeCache(forwardCache, forwardGeocodeCacheKey(query), results);
}

export function getCachedReverseGeocode(
  lat: number,
  lng: number,
): AddressSearchResult | null | undefined {
  const cached = readCache(reverseCache, reverseGeocodeCacheKey(lat, lng));
  return cached;
}

export function setCachedReverseGeocode(
  lat: number,
  lng: number,
  result: AddressSearchResult | null,
): void {
  writeCache(reverseCache, reverseGeocodeCacheKey(lat, lng), result);
}
