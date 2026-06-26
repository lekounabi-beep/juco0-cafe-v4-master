import { storeLocation } from '@/config/map-defaults';
import type { AddressSearchResult } from '../types/address';
import { parseMapboxFeature } from './address-parser';

type MapboxSearchResponse = {
  features?: unknown[];
};

const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

function mapboxToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
}

function endpoint(path: string, params: Record<string, string>): string {
  const token = mapboxToken();
  if (!token) {
    throw new Error('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is required for checkout location search');
  }

  const query = new URLSearchParams({
    access_token: token,
    country: 'gr',
    language: 'el',
    proximity: `${storeLocation.lng},${storeLocation.lat}`,
    ...params,
  });

  return `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(path)}.json?${query.toString()}`;
}

export async function searchAddresses(
  query: string,
  signal?: AbortSignal
): Promise<AddressSearchResult[]> {
  const normalized = query.trim();
  if (normalized.length < 2) return [];

  const response = await fetch(
    endpoint(normalized, {
      autocomplete: 'true',
      limit: '6',
      types: 'address,poi,place,postcode',
    }),
    { signal }
  );

  if (!response.ok) {
    throw new Error('Address search failed');
  }

  const data = (await response.json()) as MapboxSearchResponse;
  return (data.features ?? [])
    .map((feature) => parseMapboxFeature(feature as Parameters<typeof parseMapboxFeature>[0]))
    .filter((result): result is AddressSearchResult => result != null);
}

export async function reverseSearchAddress(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<AddressSearchResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const response = await fetch(
    endpoint(`${lng},${lat}`, {
      limit: '1',
      types: 'address,poi',
    }),
    { signal }
  );

  if (!response.ok) {
    throw new Error('Reverse geocoding failed');
  }

  const data = (await response.json()) as MapboxSearchResponse;
  const first = data.features?.[0];
  return first ? parseMapboxFeature(first as Parameters<typeof parseMapboxFeature>[0]) : null;
}
