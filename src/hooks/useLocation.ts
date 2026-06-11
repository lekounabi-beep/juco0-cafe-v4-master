import { useState, useCallback } from 'react';

export function useLocation() {
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const getLocation = useCallback(async (onLocationFound?: (coords: { lat: number; lng: number }) => void) => {
    setLocError(null);
    if (!('geolocation' in navigator)) {
      setLocError('Η συσκευή σου δεν υποστηρίζει εντοπισμό τοποθεσίας.');
      return;
    }
    setLocating(true);
    
    // Increased timeout for mobile devices and added maximumAge for cached positions
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const newCoords = { lat: latitude, lng: longitude };
        
        if (onLocationFound) {
          onLocationFound(newCoords);
        }
        
        // Reverse geocoding to get address from coordinates
        if (window.google && window.google.maps) {
          try {
            const geocoder = new window.google.maps.Geocoder();
            const response = await geocoder.geocode({
              location: newCoords
            });
            
            if (response.results && response.results[0]) {
              const event = new CustomEvent('addressFromLocation', { 
                detail: { address: response.results[0].formatted_address, coords: newCoords }
              });
              window.dispatchEvent(event);
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
        timeout: 30000, // Increased from 10s to 30s for mobile
        maximumAge: 0 // Don't use cached positions
      }
    );
  }, []);

  return {
    locating,
    locError,
    getLocation,
  };
}
