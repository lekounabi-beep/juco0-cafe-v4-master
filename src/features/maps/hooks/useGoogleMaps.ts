/**
 * Google Maps hook - handles map initialization and loading
 */

import { useEffect, useRef, useCallback } from 'react';
import { googleMapsLoader } from '@/integrations/google-maps/loader';
import { googleMapsConfig } from '@/integrations/google-maps/config';
import { useMapsStore } from '../store/maps-store';
import type { MapConfig } from '../types/maps.types';

export function useGoogleMaps(
  mapRef: React.RefObject<HTMLDivElement>,
  shouldInitialize: boolean = true,
  config?: Partial<MapConfig>
) {
  const mapInstanceRef = useRef<any>(null);
  const { 
    mapCenter, 
    setMapCenter, 
    setMapLoaded, 
    setLoadError,
    isMapLoaded 
  } = useMapsStore();

  // Load Google Maps script
  useEffect(() => {
    if (!shouldInitialize) return;

    googleMapsLoader.load()
      .then(() => {
        setMapLoaded(true);
        setLoadError(null);
      })
      .catch((error) => {
        console.error('Failed to load Google Maps:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load Google Maps');
      });
  }, [shouldInitialize, setMapLoaded, setLoadError]);

  // Initialize map
  useEffect(() => {
    if (!isMapLoaded || !shouldInitialize || !mapRef.current || mapInstanceRef.current) {
      return;
    }

    const mapElement = document.getElementById('map') || mapRef.current;
    if (!mapElement) {
      console.error('Map element not found');
      return;
    }

    const initialCenter = mapCenter || googleMapsConfig.defaultCenter;
    const mapConfig: MapConfig = {
      center: initialCenter,
      zoom: config?.zoom || googleMapsConfig.defaultZoom,
      gestureHandling: config?.gestureHandling || 'cooperative',
      disableDefaultUI: config?.disableDefaultUI !== false,
    };

    const map = new window.google.maps.Map(mapElement, {
      center: mapConfig.center,
      zoom: mapConfig.zoom,
      gestureHandling: mapConfig.gestureHandling,
      disableDefaultUI: mapConfig.disableDefaultUI,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });

    mapInstanceRef.current = map;
    setMapCenter(initialCenter);

    // Store panToLocation function
    useMapsStore.getState().setPanToLocation((lat: number, lng: number) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({ lat, lng });
        mapInstanceRef.current.setZoom(googleMapsConfig.deliveryZoom);
      }
    });

    // Add drag event listener
    let geocodeTimeout: NodeJS.Timeout;
    map.addListener('dragend', () => {
      const center = map.getCenter();
      const newCoords = { lat: center.lat(), lng: center.lng() };
      setMapCenter(newCoords);
      useMapsStore.getState().setSelectedCoords(newCoords);

      // Debounced reverse geocoding
      clearTimeout(geocodeTimeout);
      geocodeTimeout = setTimeout(async () => {
        if (window.google && window.google.maps) {
          try {
            const geocoder = new window.google.maps.Geocoder();
            const response = await geocoder.geocode({ location: newCoords });
            
            if (response.results && response.results[0]) {
              useMapsStore.getState().setSelectedAddress(response.results[0].formatted_address);
            }
          } catch (error) {
            console.error('Reverse geocoding error:', error);
          }
        }
      }, 300);
    });

    return () => {
      mapInstanceRef.current = null;
      useMapsStore.getState().setPanToLocation(null);
    };
  }, [isMapLoaded, shouldInitialize, mapRef, mapCenter, setMapCenter, config]);

  return {
    mapRef,
    mapInstanceRef,
  };
}
