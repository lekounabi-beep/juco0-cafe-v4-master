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
  const [isReady, setIsReady] = useState(false);
  const [center, setCenter] = useState<LatLng | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Subscribe to MAP_READY
    const unsubscribeReady = mapEngine.on('MAP_READY', () => {
      console.log('[useMapState] Map ready');
      setIsReady(true);
    });

    // Subscribe to CENTER_CHANGED
    const unsubscribeCenter = mapEngine.on('CENTER_CHANGED', (coords) => {
      console.log('[useMapState] Center changed:', coords);
      setCenter(coords);
    });

    // Subscribe to ZOOM_CHANGED
    const unsubscribeZoom = mapEngine.on('ZOOM_CHANGED', (zoomLevel) => {
      console.log('[useMapState] Zoom changed:', zoomLevel);
      setZoom(zoomLevel);
    });

    // Subscribe to ADDRESS_CHANGED
    const unsubscribeAddress = mapEngine.on('ADDRESS_CHANGED', (addr) => {
      console.log('[useMapState] Address changed:', addr);
      setAddress(addr);
    });

    // Subscribe to DRAG_START
    const unsubscribeDragStart = mapEngine.on('DRAG_START', () => {
      console.log('[useMapState] Drag started');
      setIsDragging(true);
    });

    // Subscribe to DRAG_END
    const unsubscribeDragEnd = mapEngine.on('DRAG_END', (coords) => {
      console.log('[useMapState] Drag ended:', coords);
      setIsDragging(false);
    });

    // Cleanup all subscriptions
    return () => {
      unsubscribeReady();
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
