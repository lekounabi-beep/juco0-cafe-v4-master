'use client';

import { useEffect } from 'react';
import { googleMapsLoader } from '@/integrations/google-maps/loader';

/** Preload Google Maps script as soon as driver app mounts. */
export function DriverGoogleMapsPreload() {
  useEffect(() => {
    void googleMapsLoader.load().catch((error) => {
      console.error('[DriverGoogleMapsPreload] Google Maps load failed', {
        source: 'DriverGoogleMapsPreload',
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, []);

  return null;
}
