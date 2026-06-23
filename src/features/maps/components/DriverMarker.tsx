/**
 * Animated Scooter Marker
 * Premium Wolt/Uber Eats style driver marker with smooth animation
 */

'use client';

import { useEffect, useRef, RefObject } from 'react';
import { calculateDistance } from '@/features/delivery/services/distance.service';

// Custom type for Google Maps icon with rotation support
interface RotatableIcon extends google.maps.Symbol {
  rotation?: number;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWeight?: number;
  scale?: number;
  anchor?: google.maps.Point;
}

interface DriverMarkerProps {
  mapRef: RefObject<any>;
  position: { lat: number; lng: number };
  heading: number;
}

export function DriverMarker({ mapRef, position, heading }: DriverMarkerProps) {
  const markerRef = useRef<google.maps.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || !window.google.maps) return;

    // Create custom scooter icon
    const scooterIcon: RotatableIcon = {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      fillColor: '#10b981',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 1.5,
      anchor: new google.maps.Point(12, 24),
      rotation: heading,
    };

    // Create marker
    const marker = new google.maps.Marker({
      position: new google.maps.LatLng(position.lat, position.lng),
      map,
      icon: scooterIcon,
      zIndex: 1000,
    });

    markerRef.current = marker;

    // Add glow effect using circle
    const glowCircle = new google.maps.Circle({
      map,
      center: new google.maps.LatLng(position.lat, position.lng),
      radius: 30,
      fillColor: '#10b981',
      fillOpacity: 0.3,
      strokeColor: '#10b981',
      strokeWeight: 2,
      strokeOpacity: 0.5,
      zIndex: 999,
    });

    // Animate glow
    let glowRadius = 30;
    let growing = true;

    const animateGlow = () => {
      if (growing) {
        glowRadius += 0.5;
        if (glowRadius >= 40) growing = false;
      } else {
        glowRadius -= 0.5;
        if (glowRadius <= 30) growing = true;
      }

      glowCircle.setRadius(glowRadius);
      animationFrameRef.current = requestAnimationFrame(animateGlow);
    };

    animateGlow();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      marker.setMap(null);
      glowCircle.setMap(null);
    };
  }, [mapRef]);

  // Update position and heading smoothly
  useEffect(() => {
    if (!markerRef.current) return;

    const marker = markerRef.current;
    const currentIcon = marker.getIcon() as RotatableIcon;
    const currentHeading = currentIcon?.rotation || 0;

    // Smooth heading rotation
    const animateHeading = () => {
      const diff = heading - currentHeading;
      const steps = 10;
      const stepHeading = diff / steps;
      let currentStep = 0;

      const animate = () => {
        if (currentStep >= steps) {
          marker.setIcon({
            ...currentIcon,
            rotation: heading,
          } as RotatableIcon);
          return;
        }

        const newHeading = currentHeading + stepHeading * (currentStep + 1);
        marker.setIcon({
          ...currentIcon,
          rotation: newHeading,
        } as RotatableIcon);

        currentStep++;
        requestAnimationFrame(animate);
      };

      animate();
    };

    // Smooth position transition
    const currentPosition = marker.getPosition();
    if (currentPosition) {
      const fromCoords = { lat: currentPosition.lat(), lng: currentPosition.lng() };
      const toCoords = { lat: position.lat, lng: position.lng };
      const distance = calculateDistance(fromCoords, toCoords);

      if (distance < 10) {
        marker.setPosition(new google.maps.LatLng(position.lat, position.lng));
        animateHeading();
        return;
      }

      const steps = 20;
      const stepLat = (position.lat - currentPosition.lat()) / steps;
      const stepLng = (position.lng - currentPosition.lng()) / steps;
      let currentStep = 0;

      const animate = () => {
        if (currentStep >= steps) {
          marker.setPosition(new google.maps.LatLng(position.lat, position.lng));
          animateHeading();
          return;
        }

        const newLat = currentPosition.lat() + stepLat * (currentStep + 1);
        const newLng = currentPosition.lng() + stepLng * (currentStep + 1);
        marker.setPosition(new google.maps.LatLng(newLat, newLng));

        currentStep++;
        requestAnimationFrame(animate);
      };

      animate();
    }
  }, [position, heading]);

  return null;
}
