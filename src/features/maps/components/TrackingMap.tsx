/**
 * Premium Tracking Map Component
 * Wolt/Uber Eats style map with dark theme, animated markers, and route rendering
 */

'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { mapEngine } from '@/features/maps/engine/MapEngine';
import { useMapState } from '@/features/maps/hooks/useMapState';
import { DriverMarker } from './DriverMarker';
import { DestinationMarker } from './DestinationMarker';
import { RouteRenderer } from './RouteRenderer';
import { MapCamera } from './MapCamera';
import { DriverTrail } from './DriverTrail';

interface TrackingMapProps {
  driverPosition: { lat: number; lng: number } | null;
  driverHeading: number;
  destination: { lat: number; lng: number } | null;
  storeLocation?: { lat: number; lng: number };
  deliveryStatus: string;
  deliveryStarted: boolean;
}

export function TrackingMap({
  driverPosition,
  driverHeading,
  destination,
  storeLocation,
  deliveryStatus,
  deliveryStarted,
}: TrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const { isReady } = useMapState();

  // Initialize MapEngine on mount
  useEffect(() => {
    if (mapContainerRef.current && !mapEngine.isReady()) {
      mapEngine.attach(mapContainerRef.current).catch((error) => {
        console.error('[TrackingMap] Failed to initialize map:', error);
      });
    }
  }, []);

  // Update map instance ref when map is ready
  useEffect(() => {
    if (isReady) {
      mapInstanceRef.current = mapEngine.getMap();
    }
  }, [isReady]);

  // Create ref wrapper for child components
  const mapRefWrapper = useRef({ current: mapInstanceRef.current });
  useEffect(() => {
    mapRefWrapper.current = { current: mapInstanceRef.current };
  }, [mapInstanceRef.current]);

  const [driverPositions, setDriverPositions] = useState<{ lat: number; lng: number }[]>([]);

  // Track driver positions for trail
  useEffect(() => {
    if (driverPosition) {
      setDriverPositions(prev => {
        const newPositions = [...prev, driverPosition];
        // Keep only last 100 positions to avoid memory issues
        if (newPositions.length > 100) {
          newPositions.shift();
        }
        return newPositions;
      });
    }
  }, [driverPosition]);

  return (
    <>
      <div ref={mapContainerRef} data-map-container="true" className="h-full w-full" />
      {isReady && mapInstanceRef.current && (
        <>
          <DriverMarker
            mapRef={mapRefWrapper}
            position={driverPosition || { lat: 0, lng: 0 }}
            heading={driverHeading}
          />
          {destination && (
            <DestinationMarker
              mapRef={mapRefWrapper}
              position={destination}
              type="destination"
            />
          )}
          {destination && driverPosition && (
            <RouteRenderer
              mapRef={mapRefWrapper}
              driverPosition={driverPosition}
              destination={destination}
              storeLocation={storeLocation}
              deliveryStarted={deliveryStarted}
            />
          )}
          {storeLocation && (
            <DestinationMarker
              mapRef={mapRefWrapper}
              position={storeLocation}
              type="store"
            />
          )}
          {deliveryStarted && driverPositions.length > 1 && (
            <DriverTrail
              mapRef={mapRefWrapper}
              positions={driverPositions}
              maxTrailLength={500}
            />
          )}
          <MapCamera
            mapRef={mapRefWrapper}
            driverPosition={driverPosition}
            destination={destination}
            deliveryStatus={deliveryStatus}
          />
        </>
      )}
    </>
  );
}
