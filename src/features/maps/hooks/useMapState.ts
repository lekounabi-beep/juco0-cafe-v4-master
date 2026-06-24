/**
 * useMapState - React State Subscription Hook
 * 
 * Subscribes to MapEngine events and updates React state.
 * This is the ONLY place where React state is coupled to map events.
 */

import { useState, useEffect, useCallback } from 'react';
import { mapEngine } from '../engine/MapEngine';
import type { LatLng, Address } from '../engine/types';

export function useMapState() {
  const [isReady, setIsReady] = useState(() => mapEngine.isReady());
  const [center, setCenter] = useState<LatLng | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (mapEngine.isReady()) {
      setIsReady(true);
    }

    const unsubscribeReady = mapEngine.on('MAP_READY', () => {
      setIsReady(true);
    });

    const unsubscribeDestroyed = mapEngine.on('MAP_DESTROYED', () => {
      setIsReady(false);
    });

    const unsubscribeCenter = mapEngine.on('CENTER_CHANGED', (coords) => {
      setCenter(coords);
    });

    const unsubscribeZoom = mapEngine.on('ZOOM_CHANGED', (zoomLevel) => {
      setZoom(zoomLevel);
    });

    const unsubscribeAddress = mapEngine.on('ADDRESS_CHANGED', (addr) => {
      setAddress(addr);
    });

    const unsubscribeDragStart = mapEngine.on('DRAG_START', () => {
      setIsDragging(true);
    });

    const unsubscribeDragEnd = mapEngine.on('DRAG_END', () => {
      setIsDragging(false);
    });

    return () => {
      unsubscribeReady();
      unsubscribeDestroyed();
      unsubscribeCenter();
      unsubscribeZoom();
      unsubscribeAddress();
      unsubscribeDragStart();
      unsubscribeDragEnd();
    };
  }, []);

  // Imperative controls
  const setCenterImperative = useCallback((lat: number, lng: number) => {
    mapEngine.setCenter(lat, lng);
  }, []);

  const setZoomImperative = useCallback((zoom: number) => {
    mapEngine.setZoom(zoom);
  }, []);

  return {
    // State
    isReady,
    center,
    zoom,
    address,
    isDragging,
    
    // Imperative controls
    setCenter: setCenterImperative,
    setZoom: setZoomImperative,
  };
}
