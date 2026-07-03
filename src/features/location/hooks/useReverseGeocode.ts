"use client";

import { useEffect, useRef, useState } from "react";
import type { AddressSearchResult } from "../types/address";
import { reverseGeocodeAddress } from "../services/reverse-geocoder";

const REVERSE_GEOCODE_DEBOUNCE_MS = 500;

export function useReverseGeocode(coords: { lat: number; lng: number } | null, enabled: boolean) {
  const [address, setAddress] = useState<AddressSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);

  const lat = coords?.lat;
  const lng = coords?.lng;

  useEffect(() => {
    if (!enabled || lat == null || lng == null) {
      inFlightRef.current?.abort();
      inFlightRef.current = null;
      setLoading(false);
      setError(null);
      return;
    }

    const debounceTimer = window.setTimeout(() => {
      inFlightRef.current?.abort();

      const controller = new AbortController();
      inFlightRef.current = controller;
      const requestSeq = ++requestSeqRef.current;

      setLoading(true);
      setError(null);

      reverseGeocodeAddress(lat, lng, controller.signal)
        .then((result) => {
          if (controller.signal.aborted || requestSeq !== requestSeqRef.current) return;
          if (!result) {
            setAddress(null);
            setError("Δεν βρέθηκε διεύθυνση.");
            return;
          }
          setAddress(result);
        })
        .catch((err) => {
          if (controller.signal.aborted || requestSeq !== requestSeqRef.current) return;
          setError(
            err instanceof Error ? err.message : "Προσωρινό πρόβλημα σύνδεσης. Δοκίμασε ξανά.",
          );
        })
        .finally(() => {
          if (controller.signal.aborted || requestSeq !== requestSeqRef.current) return;
          setLoading(false);
          if (inFlightRef.current === controller) {
            inFlightRef.current = null;
          }
        });
    }, REVERSE_GEOCODE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(debounceTimer);
      inFlightRef.current?.abort();
      inFlightRef.current = null;
      requestSeqRef.current += 1;
    };
  }, [lat, lng, enabled]);

  return { address, loading, error };
}
