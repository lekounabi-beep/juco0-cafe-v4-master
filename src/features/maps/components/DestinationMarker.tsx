/**
 * Custom Destination Markers
 * Premium Wolt/Uber Eats style destination and store markers
 */

'use client';

import { useEffect, useRef, RefObject } from 'react';

interface DestinationMarkerProps {
  mapRef: RefObject<any>;
  position: { lat: number; lng: number };
  type: 'destination' | 'store';
}

export function DestinationMarker({ mapRef, position, type }: DestinationMarkerProps) {
  const markerRef = useRef<google.maps.Marker | null>(null);
  const pulseCircleRef = useRef<google.maps.Circle | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || !window.google.maps) return;

    let icon: google.maps.Icon;
    let pulseColor: string;

    if (type === 'destination') {
      // Customer destination - white circle with green border
      icon = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#ffffff',
        fillOpacity: 1,
        strokeColor: '#10b981',
        strokeWeight: 3,
      } as any;
      pulseColor = '#10b981';
    } else {
      // Store - coffee icon
      icon = {
        path: 'M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.83 2.95 7.18 6.78 7.29 3.96.12 7.22-3.06 7.22-7v-1h.5c1.93 0 3.5-1.57 3.5-3.5S20.43 3 18.5 3zM16 8.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm-6 0c0 .83-.67 1.5-1.5 1.5S7 9.33 7 8.5 7.67 7 8.5 7s1.5.67 1.5 1.5z',
        fillColor: '#10b981',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 1.2,
        anchor: new google.maps.Point(12, 12),
      } as any;
      pulseColor = '#10b981';
    }

    // Create marker
    const marker = new google.maps.Marker({
      position: new google.maps.LatLng(position.lat, position.lng),
      map,
      icon,
      zIndex: 500,
    });

    markerRef.current = marker;

    // Add pulse animation for destination
    if (type === 'destination') {
      const pulseCircle = new google.maps.Circle({
        map,
        center: new google.maps.LatLng(position.lat, position.lng),
        radius: 20,
        fillColor: pulseColor,
        fillOpacity: 0.3,
        strokeColor: pulseColor,
        strokeWeight: 2,
        strokeOpacity: 0.5,
        zIndex: 499,
      });

      pulseCircleRef.current = pulseCircle;

      // Animate pulse
      let pulseRadius = 20;
      let pulseOpacity = 0.3;
      let growing = true;

      const animatePulse = () => {
        if (growing) {
          pulseRadius += 0.3;
          pulseOpacity -= 0.005;
          if (pulseRadius >= 35 || pulseOpacity <= 0.1) growing = false;
        } else {
          pulseRadius -= 0.3;
          pulseOpacity += 0.005;
          if (pulseRadius <= 20 || pulseOpacity >= 0.3) growing = true;
        }

        pulseCircle.setRadius(pulseRadius);
        pulseCircle.setOptions({ fillOpacity: pulseOpacity, strokeOpacity: pulseOpacity + 0.2 });
        animationFrameRef.current = requestAnimationFrame(animatePulse);
      };

      animatePulse();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      marker.setMap(null);
      if (pulseCircleRef.current) {
        pulseCircleRef.current.setMap(null);
      }
    };
  }, [mapRef, type]);

  return null;
}
