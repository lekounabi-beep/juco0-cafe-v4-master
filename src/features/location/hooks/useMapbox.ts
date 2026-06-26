'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { storeLocation } from '@/config/map-defaults';

type MapboxModule = typeof import('mapbox-gl');

type UseMapboxOptions = {
  enabled: boolean;
  onMoveEnd: (coords: { lat: number; lng: number }) => void;
};

export function useMapbox({ enabled, onMoveEnd }: UseMapboxOptions) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onMoveEndRef = useRef(onMoveEnd);
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  onMoveEndRef.current = onMoveEnd;

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  useEffect(() => {
    if (!enabled || mapRef.current || !container) return;

    let cancelled = false;
    let mapbox: MapboxModule | null = null;
    let map: mapboxgl.Map | null = null;
    let rafId: number | null = null;

    const waitForContainer = () =>
      new Promise<void>((resolve, reject) => {
        const startedAt = performance.now();

        const check = () => {
          if (cancelled) return;
          const rect = container.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            resolve();
            return;
          }
          if (performance.now() - startedAt > 3000) {
            reject(new Error(`Map container has no size (${Math.round(rect.width)}x${Math.round(rect.height)})`));
            return;
          }
          rafId = requestAnimationFrame(check);
        };

        rafId = requestAnimationFrame(check);
      });

    void (async () => {
      try {
        setError(null);
        mapbox = await import('mapbox-gl');
        await waitForContainer();

        const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
        if (!token) {
          throw new Error('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is required for checkout location map');
        }

        if (cancelled) return;

        mapbox.default.accessToken = token;
        map = new mapbox.default.Map({
          container,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [storeLocation.lng, storeLocation.lat],
          zoom: 15,
          attributionControl: false,
          pitchWithRotate: false,
          dragRotate: false,
        });

        map.addControl(new mapbox.default.NavigationControl({ showCompass: false }), 'bottom-right');
        mapRef.current = map;

        const handleMoveEnd = () => {
          const center = map?.getCenter();
          if (!center) return;
          onMoveEndRef.current({ lat: center.lat, lng: center.lng });
        };

        const markReady = () => {
          if (cancelled || !map) return;
          map.resize();
          readyRef.current = true;
          setReady(true);
          handleMoveEnd();
        };

        requestAnimationFrame(markReady);
        map.on('load', markReady);
        map.on('idle', markReady);
        map.on('styledata', markReady);
        map.on('render', () => {
          if (map?.loaded()) {
            markReady();
          }
        });
        map.on('error', (event) => {
          if (cancelled) return;
          if (!mapRef.current?.loaded() && !readyRef.current) {
            setError(event.error?.message ?? 'Mapbox map failed to load');
          }
        });
        map.on('moveend', handleMoveEnd);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Mapbox map failed to load');
      }
    })();

    return () => {
      cancelled = true;
      if (rafId != null) {
        cancelAnimationFrame(rafId);
      }
      if (map) {
        map.remove();
      }
      if (mapRef.current === map) {
        mapRef.current = null;
      }
      readyRef.current = false;
      setReady(false);
    };
  }, [container, enabled]);

  useEffect(() => {
    if (!enabled || !mapRef.current) return;
    let rafId = requestAnimationFrame(() => {
      mapRef.current?.resize();
      rafId = requestAnimationFrame(() => mapRef.current?.resize());
    });
    return () => cancelAnimationFrame(rafId);
  }, [enabled]);

  const flyTo = useCallback((coords: { lat: number; lng: number }) => {
    mapRef.current?.flyTo({
      center: [coords.lng, coords.lat],
      zoom: 17,
      essential: true,
      duration: 650,
    });
  }, []);

  return {
    containerRef,
    ready,
    error,
    flyTo,
  };
}
