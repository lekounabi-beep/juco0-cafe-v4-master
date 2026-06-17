/**
 * Reverse Geocoding hook - converts coordinates to address
 */

import { useCallback } from 'react';
import { reverseGeocode } from '@/integrations/google-maps/services/googleMaps.service';
import { useMapsStore } from '../store/maps-store';

export function useReverseGeocoding() {
  const { setSelectedAddress } = useMapsStore();

  const reverseGeocodeCoords = useCallback(async (coords: { lat: number; lng: number }) => {
    const address = await reverseGeocode(coords);
    if (address) {
      setSelectedAddress(address);
      return address;
    }
    return null;
  }, [setSelectedAddress]);

  return {
    reverseGeocodeCoords,
  };
}
