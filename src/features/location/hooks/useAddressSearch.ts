'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AddressSearchResult } from '../types/address';
import { searchAddresses } from '../services/mapbox-search';

export function useAddressSearch(query: string, enabled: boolean) {
  const normalizedQuery = useMemo(() => query.trim(), [query]);
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || normalizedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      searchAddresses(normalizedQuery, controller.signal)
        .then(setResults)
        .catch((err) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setError(err instanceof Error ? err.message : 'Address search failed');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [enabled, normalizedQuery]);

  return { results, loading, error };
}
