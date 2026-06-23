/**
 * Route Renderer
 * Renders green delivery route with glowing trail
 * Uses Google DirectionsService for real routing
 */

'use client';

import { useEffect, useRef, useState, RefObject } from 'react';
import { calculateDistance } from '@/features/delivery/services/distance.service';

interface RouteRendererProps {
  mapRef: RefObject<any>;
  driverPosition: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  storeLocation?: { lat: number; lng: number };
  deliveryStarted: boolean;
}

export function RouteRenderer({
  mapRef,
  driverPosition,
  destination,
  storeLocation,
  deliveryStarted,
}: RouteRendererProps) {
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const trailPolylineRef = useRef<google.maps.Polyline | null>(null);
  const [routePoints, setRoutePoints] = useState<google.maps.LatLng[]>([]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || !window.google.maps) return;

    directionsServiceRef.current = new google.maps.DirectionsService();
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map,
      polylineOptions: {
        strokeColor: '#10b981',
        strokeWeight: 6,
        strokeOpacity: 0.8,
      },
      suppressMarkers: true,
      preserveViewport: true,
    });

    // Create trail polyline
    trailPolylineRef.current = new google.maps.Polyline({
      map,
      path: [],
      strokeColor: '#10b981',
      strokeWeight: 4,
      strokeOpacity: 0.5,
      geodesic: true,
    });

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      if (trailPolylineRef.current) {
        trailPolylineRef.current.setMap(null);
      }
    };
  }, [mapRef]);

  // Calculate and render route
  useEffect(() => {
    if (
      !directionsServiceRef.current ||
      !directionsRendererRef.current ||
      !driverPosition ||
      !destination
    ) {
      return;
    }

    const service = directionsServiceRef.current;
    const renderer = directionsRendererRef.current;

    const origin = driverPosition;
    const waypoints: google.maps.DirectionsWaypoint[] = [];

    // If delivery hasn't started, route from store to destination
    if (!deliveryStarted && storeLocation) {
      waypoints.push({
        location: storeLocation,
        stopover: true,
      });
    }

    service.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          renderer.setDirections(result);

          // Extract route points for trail
          const points: google.maps.LatLng[] = [];
          if (result.routes[0]?.legs) {
            result.routes[0].legs.forEach((leg) => {
              if (leg.steps) {
                leg.steps.forEach((step) => {
                  if (step.path) {
                    step.path.forEach((point) => {
                      points.push(point);
                    });
                  }
                });
              }
            });
          }
          setRoutePoints(points);
        }
      }
    );
  }, [driverPosition, destination, storeLocation, deliveryStarted]);

  // Update trail with driver position
  useEffect(() => {
    if (!trailPolylineRef.current || !driverPosition || routePoints.length === 0) return;

    const trail = trailPolylineRef.current;
    const driverLatLng = new google.maps.LatLng(driverPosition.lat, driverPosition.lng);

    // Find closest point on route to driver
    let closestIndex = 0;
    let minDistance = Infinity;

    routePoints.forEach((point, index) => {
      const fromCoords = { lat: driverLatLng.lat(), lng: driverLatLng.lng() };
      const toCoords = { lat: point.lat(), lng: point.lng() };
      const distance = calculateDistance(fromCoords, toCoords);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // Trail includes points from start to current driver position
    const trailPath = routePoints.slice(0, closestIndex + 1);
    trail.setPath(trailPath);
  }, [driverPosition, routePoints]);

  return null;
}
