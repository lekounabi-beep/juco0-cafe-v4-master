"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AddressSearchResult } from "../types/address";
import { searchAddresses } from "../services/mapbox-search";

const ADDRESS_SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;

export function useAddressSearch(query: string, enabled: boolean) {
  const normalizedQuery = useMemo(() => query.trim(), [query]);
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    if (!enabled || normalizedQuery.length < MIN_QUERY_LENGTH) {
      requestSeqRef.current += 1;
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const debounceTimer = window.setTimeout(() => {
      const requestSeq = ++requestSeqRef.current;

      setLoading(true);
      setError(null);

      searchAddresses(normalizedQuery, controller.signal)
        .then((nextResults) => {
          if (controller.signal.aborted || requestSeq !== requestSeqRef.current) return;
          setResults(nextResults);
        })
        .catch((err) => {
          if (controller.signal.aborted || requestSeq !== requestSeqRef.current) return;
          setResults([]);
          setError(err instanceof Error ? err.message : "Address search failed");
        })
        .finally(() => {
          if (controller.signal.aborted || requestSeq !== requestSeqRef.current) return;
          setLoading(false);
        });
    }, ADDRESS_SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(debounceTimer);
      requestSeqRef.current += 1;
    };
  }, [enabled, normalizedQuery]);

  return { results, loading, error };
}
