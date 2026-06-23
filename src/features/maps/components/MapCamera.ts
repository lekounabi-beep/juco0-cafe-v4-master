/**
 * Smart Map Camera
 * Auto-follows driver with intelligent zoom behavior
 */

'use client';

import { useEffect, useRef, RefObject } from 'react';
import { calculateDistance } from '@/features/delivery/services/distance.service';
import { mapEngine } from '../engine/MapEngine';

interface MapCameraProps {
  mapRef: RefObject<any>;
  driverPosition: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  deliveryStatus: string;
}

export function MapCamera({
  mapRef,
  driverPosition,
  destination,
  deliveryStatus,
}: MapCameraProps) {
  const isAnimatingRef = useRef(false);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !driverPosition) return;

    const animateCamera = () => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      const driverLatLng = new google.maps.LatLng(driverPosition.lat, driverPosition.lng);

      if (destination) {
        const fromCoords = { lat: driverLatLng.lat(), lng: driverLatLng.lng() };
        const toCoords = { lat: destination.lat, lng: destination.lng };
        const distance = calculateDistance(fromCoords, toCoords);

        // Calculate appropriate zoom based on distance
        let targetZoom: number;
        if (distance < 500) {
          targetZoom = 17; // Close - zoom in
        } else if (distance < 2000) {
          targetZoom = 15; // Medium distance
        } else {
          targetZoom = 13; // Far - zoom out
        }

        // If delivery almost complete, zoom in more
        if (deliveryStatus === 'arrived' || deliveryStatus === 'delivered') {
          targetZoom = 18;
        }

        // Fit bounds to show both driver and destination
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(driverLatLng);
        bounds.extend(new google.maps.LatLng(destination.lat, destination.lng));

        map.fitBounds(bounds);

        // Smoothly adjust zoom after fitBounds
        setTimeout(() => {
          const currentZoom = map.getZoom() || 14;
          if (Math.abs(currentZoom - targetZoom) > 1) {
            map.setZoom(targetZoom);
          }
          isAnimatingRef.current = false;
        }, 300);
      } else {
        // No destination yet, center on driver
        map.panTo(driverLatLng);
        map.setZoom(15);
        isAnimatingRef.current = false;
      }

      lastPositionRef.current = driverPosition;
    };

    // Only animate if position changed significantly
    if (!lastPositionRef.current) {
      animateCamera();
    } else {
      const lastLat = lastPositionRef.current.lat;
      const lastLng = lastPositionRef.current.lng;
      const latDiff = Math.abs(driverPosition.lat - lastLat);
      const lngDiff = Math.abs(driverPosition.lng - lastLng);

      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        animateCamera();
      }
    }
  }, [mapRef, driverPosition, destination, deliveryStatus]);

  return null;
}
