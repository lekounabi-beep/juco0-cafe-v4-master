'use client';

import { useEffect, useState } from 'react';
import type { AddressSearchResult } from '../types/address';
import { reverseGeocodeAddress } from '../services/reverse-geocoder';

export function useReverseGeocode(
  coords: { lat: number; lng: number } | null,
  enabled: boolean
) {
  const [address, setAddress] = useState<AddressSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !coords) {
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    reverseGeocodeAddress(coords.lat, coords.lng, controller.signal)
      .then(setAddress)
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Reverse geocoding failed');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [coords, enabled]);

  return { address, loading, error };
}
