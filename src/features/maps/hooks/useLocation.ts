/**
 * Location hook - handles browser geolocation
 */

import { useState, useCallback } from 'react';
import { reverseGeocode } from '@/integrations/google-maps/services/googleMaps.service';
import { useMapsStore } from '../store/maps-store';

export function useLocation() {
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const { setMapCenter, setSelectedAddress, setSelectedCoords } = useMapsStore();

  const getLocation = useCallback(async (onLocationFound?: (coords: { lat: number; lng: number }) => void) => {
    setLocError(null);
    if (!('geolocation' in navigator)) {
      setLocError('Η συσκευή σου δεν υποστηρίζει εντοπισμό τοποθεσίας.');
      return;
    }
    setLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const newCoords = { lat: latitude, lng: longitude };
        
        setMapCenter(newCoords);
        setSelectedCoords(newCoords);
        
        if (onLocationFound) {
          onLocationFound(newCoords);
        }
        
        // Reverse geocoding
        if (window.google && window.google.maps) {
          try {
            const address = await reverseGeocode(newCoords);
            if (address) {
              setSelectedAddress(address);
            }
          } catch (error) {
            console.error('Reverse geocoding error:', error);
            setLocError('Βρέθηκε η τοποθεσία αλλά όχι η διεύθυνση.');
          }
        }
        
        setLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        let errorMessage = 'Δεν μπορέσαμε να βρούμε την τοποθεσία σου.';
        
        if (err.code === 1) {
          errorMessage = 'Πρέπει να δώσεις άδεια για την τοποθεσία σου.';
        } else if (err.code === 2) {
          errorMessage = 'Η τοποθεσία δεν είναι διαθέσιμη. Δοκίμασε ξανά.';
        } else if (err.code === 3) {
          errorMessage = 'Χρονικό όριο. Δοκίμασε ξανά.';
        }
        
        setLocError(errorMessage);
        setLocating(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 30000,
        maximumAge: 0
      }
    );
  }, [setMapCenter, setSelectedAddress, setSelectedCoords]);

  return {
    locating,
    locError,
    getLocation,
  };
}
