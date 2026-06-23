/**
 * Driver Trail Component
 * Renders a glowing green trail behind the driver
 * Keeps only the last few hundred meters, fades older segments
 */

'use client';

import { useEffect, useRef, RefObject } from 'react';
import { calculateDistance } from '@/features/delivery/services/distance.service';

interface DriverTrailProps {
  mapRef: RefObject<any>;
  positions: { lat: number; lng: number }[];
  maxTrailLength?: number; // in meters
}

export function DriverTrail({
  mapRef,
  positions,
  maxTrailLength = 300,
}: DriverTrailProps) {
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || !window.google.maps) return;

    // Create polyline
    const polyline = new google.maps.Polyline({
      map,
      path: [],
      strokeColor: '#10b981',
      strokeWeight: 4,
      strokeOpacity: 0.6,
      geodesic: true,
    });

    polylineRef.current = polyline;

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [mapRef]);

  // Update trail with positions
  useEffect(() => {
    if (!polylineRef.current || positions.length < 2) return;

    const polyline = polylineRef.current;
    const path: google.maps.LatLng[] = [];

    // Calculate total distance and keep only last maxTrailLength meters
    let totalDistance = 0;
    const positionsWithDistance: Array<{ position: google.maps.LatLng; distance: number }> = [];

    for (let i = positions.length - 1; i >= 0; i--) {
      const latLng = new google.maps.LatLng(positions[i].lat, positions[i].lng);
      
      if (path.length > 0) {
        const fromCoords = { lat: path[path.length - 1].lat(), lng: path[path.length - 1].lng() };
        const toCoords = { lat: positions[i].lat, lng: positions[i].lng };
        const segmentDistance = calculateDistance(fromCoords, toCoords);
        totalDistance += segmentDistance;
      }

      positionsWithDistance.push({ position: latLng, distance: totalDistance });
      path.unshift(latLng);

      if (totalDistance >= maxTrailLength) {
        break;
      }
    }

    // Set the path
    polyline.setPath(path);

    // Create gradient effect by using multiple polylines with different opacities
    // This is a simplified version - for a true gradient we'd need custom rendering
  }, [positions, maxTrailLength]);

  return null;
}
