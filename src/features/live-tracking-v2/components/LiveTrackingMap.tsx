'use client';

import { useEffect, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { liveTrackingMapboxConfig } from '../config/mapbox';
import {
  trackV2,
  type TrackingV2TelemetryContext,
} from '../telemetry/tracking-v2-telemetry';

export type LiveTrackingMapProps = {
  destination: { lat: number; lng: number };
  driverLocation?: { lat: number; lng: number };
  className?: string;
  telemetryContext?: TrackingV2TelemetryContext;
  onMapStatusChange?: (status: 'loading' | 'ready' | 'error') => void;
};

type MapboxModule = typeof import('mapbox-gl');

type LatLng = { lat: number; lng: number };

function isValidCoord(point: LatLng | null | undefined): point is LatLng {
  if (!point) return false;
  return Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

function createDestinationMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.setAttribute('aria-label', 'Destination');
  el.innerHTML = `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      background: #ef4444;
      transform: rotate(-45deg);
      border: 2px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.45);
    "></div>
  `;
  return el;
}

function createDriverMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.setAttribute('aria-label', 'Driver');
  el.innerHTML = `
    <div style="
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #22c55e;
      border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.45);
    "></div>
  `;
  return el;
}

function warnInvalidDriverLocation(currentDriver: LatLng | undefined): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[LiveTrackingMap] Ignoring invalid driver location', currentDriver);
  }
}

function resolveSafeDriverLocation(currentDriver: LatLng | undefined): LatLng | null {
  if (!isValidCoord(currentDriver)) {
    if (currentDriver !== undefined) {
      warnInvalidDriverLocation(currentDriver);
    }
    return null;
  }
  return currentDriver;
}

function collectFitPoints(destination: LatLng, driverLocation?: LatLng | null): LatLng[] {
  const points: LatLng[] = [];
  if (isValidCoord(destination)) points.push(destination);
  if (isValidCoord(driverLocation)) points.push(driverLocation);
  return points;
}

function fitMapToPoints(
  map: mapboxgl.Map,
  mapbox: MapboxModule,
  points: LatLng[],
  animate: boolean
): void {
  if (points.length === 0) return;

  const padding = liveTrackingMapboxConfig.fitPadding;
  const duration = animate ? 450 : 0;

  if (points.length === 1) {
    const p = points[0]!;
    map.easeTo({
      center: [p.lng, p.lat],
      zoom: 15,
      duration,
      essential: true,
    });
    return;
  }

  const bounds = new mapbox.LngLatBounds();
  for (const p of points) {
    bounds.extend([p.lng, p.lat]);
  }

  map.fitBounds(bounds, {
    padding,
    maxZoom: 16,
    duration,
    essential: true,
  });
}

export function LiveTrackingMap({
  destination,
  driverLocation,
  className,
  telemetryContext,
  onMapStatusChange,
}: LiveTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapboxRef = useRef<MapboxModule | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasFittedRef = useRef(false);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const destinationRef = useRef(destination);
  const driverLocationRef = useRef(driverLocation);
  destinationRef.current = destination;
  driverLocationRef.current = driverLocation;

  const telemetryPayload = (extra?: Record<string, unknown>) => ({
    assignmentId: telemetryContext?.assignmentId ?? null,
    surface: telemetryContext?.surface ?? 'customer',
    destinationPresent: isValidCoord(destination),
    driverPresent: isValidCoord(driverLocation),
    ...extra,
  });

  useEffect(() => {
    trackV2('mounted', telemetryPayload());
    return () => {
      trackV2('unmounted', telemetryPayload());
    };
  }, []);

  useEffect(() => {
    onMapStatusChange?.(status);
    if (status === 'ready') {
      trackV2('ready', telemetryPayload());
    }
  }, [status, onMapStatusChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let map: mapboxgl.Map | null = null;
    let destinationMarker: mapboxgl.Marker | null = null;
    let driverMarker: mapboxgl.Marker | null = null;
    let rafId: number | null = null;

    const waitForContainerSize = () =>
      new Promise<void>((resolve, reject) => {
        const startedAt = performance.now();

        const check = () => {
          if (cancelled) return;
          const rect = container.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            resolve();
            return;
          }
          if (performance.now() - startedAt > 5000) {
            reject(
              new Error(
                `Map container has no size (${Math.round(rect.width)}×${Math.round(rect.height)})`
              )
            );
            return;
          }
          rafId = requestAnimationFrame(check);
        };

        rafId = requestAnimationFrame(check);
      });

    void (async () => {
      try {
        setStatus('loading');
        setErrorMessage(null);

        if (!isValidCoord(destinationRef.current)) {
          throw new Error('Invalid destination coordinates');
        }

        const token = liveTrackingMapboxConfig.accessToken;
        if (!token) {
          throw new Error(
            'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is required (same as checkout address map)'
          );
        }

        if (process.env.NODE_ENV === 'development') {
          trackV2('map_load', telemetryPayload({ phase: 'importing' }));
        }
        const mapbox = await import('mapbox-gl');
        if (cancelled) return;

        mapboxRef.current = mapbox;
        await waitForContainerSize();
        if (cancelled) return;

        trackV2('map_load', telemetryPayload({
          phase: 'container_ready',
          width: container.clientWidth,
          height: container.clientHeight,
        }));

        mapbox.default.accessToken = token;

        const dest = destinationRef.current;
        trackV2('map_load', telemetryPayload({ phase: 'creating_map' }));
        map = new mapbox.default.Map({
          container,
          style: liveTrackingMapboxConfig.style,
          center: [dest.lng, dest.lat],
          zoom: liveTrackingMapboxConfig.defaultZoom,
          attributionControl: false,
          pitchWithRotate: false,
          dragRotate: false,
        });

        mapRef.current = map;

        map.on('error', (event) => {
          if (cancelled) return;
          const message = event.error?.message ?? 'Mapbox map failed to load';
          trackV2('map_error', telemetryPayload({ message }));
          setErrorMessage(message);
          setStatus('error');
        });

        const onMapReady = () => {
          if (cancelled || !map) return;

          trackV2('map_load', telemetryPayload({ phase: 'map_ready' }));

          map.resize();

          if (!destinationMarker) {
            destinationMarker = new mapbox.default.Marker({
              element: createDestinationMarkerElement(),
              anchor: 'bottom',
            })
              .setLngLat([dest.lng, dest.lat])
              .addTo(map);
            destinationMarkerRef.current = destinationMarker;
          }

          const currentDriver = driverLocationRef.current;
          const safeDriverLocation = resolveSafeDriverLocation(currentDriver);
          if (safeDriverLocation) {
            driverMarker = new mapbox.default.Marker({
              element: createDriverMarkerElement(),
              anchor: 'center',
            })
              .setLngLat([safeDriverLocation.lng, safeDriverLocation.lat])
              .addTo(map);
            driverMarkerRef.current = driverMarker;
          }

          const points = collectFitPoints(dest, safeDriverLocation);
          fitMapToPoints(map, mapbox, points, false);
          hasFittedRef.current = true;

          setStatus('ready');
        };

        if (map.loaded()) {
          onMapReady();
        } else {
          map.once('load', onMapReady);
        }
        map.once('remove', () => {
          trackV2('map_remove', telemetryPayload());
        });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Map failed to initialize';
        trackV2('map_error', telemetryPayload({ message, phase: 'init' }));
        setErrorMessage(message);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      trackV2('map_remove', telemetryPayload({ phase: 'cleanup' }));
      if (rafId != null) {
        cancelAnimationFrame(rafId);
      }

      destinationMarker?.remove();
      driverMarker?.remove();
      destinationMarkerRef.current = null;
      driverMarkerRef.current = null;

      map?.remove();
      mapRef.current = null;
      mapboxRef.current = null;
      hasFittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const mapbox = mapboxRef.current;
    if (!map || !mapbox || status !== 'ready') return;
    if (!isValidCoord(destination)) return;

    trackV2('destination_updated', telemetryPayload({ destination }));

    if (!destinationMarkerRef.current) {
      destinationMarkerRef.current = new mapbox.Marker({
        element: createDestinationMarkerElement(),
        anchor: 'bottom',
      })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map);
    } else {
      destinationMarkerRef.current.setLngLat([destination.lng, destination.lat]);
    }

    const currentDriver = driverLocationRef.current;
    const safeDriverLocation = isValidCoord(currentDriver) ? currentDriver : null;
    if (!safeDriverLocation && currentDriver !== undefined) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[LiveTrackingMap] invalid driver location', currentDriver);
      }
    }
    trackV2('driver_updated', telemetryPayload({ driverLocation: safeDriverLocation }));

    if (safeDriverLocation) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new mapbox.Marker({
          element: createDriverMarkerElement(),
          anchor: 'center',
        })
          .setLngLat([safeDriverLocation.lng, safeDriverLocation.lat])
          .addTo(map);
      } else {
        driverMarkerRef.current.setLngLat([safeDriverLocation.lng, safeDriverLocation.lat]);
      }
    } else if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }

    const points = collectFitPoints(destination, safeDriverLocation);
    fitMapToPoints(map, mapbox, points, hasFittedRef.current);
    hasFittedRef.current = true;
  }, [destination, driverLocation, status]);

  useEffect(() => {
    if (!mapRef.current || status !== 'ready') return;

    const id = requestAnimationFrame(() => {
      mapRef.current?.resize();
      trackV2('resize', telemetryPayload({
        rect: containerRef.current?.getBoundingClientRect(),
      }));
    });

    return () => cancelAnimationFrame(id);
  }, [status]);

  const showLoading = status === 'loading';
  const showError = status === 'error';

  return (
    <div className={cn('relative h-full w-full min-h-[220px] overflow-hidden', className)}>
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 h-full w-full"
        data-testid="live-tracking-map"
        aria-hidden={showError}
      />

      {showLoading && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/50 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
          <p className="text-sm text-white/80">Φόρτωση χάρτη…</p>
        </div>
      )}

      {showError && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 px-6 text-center"
          role="alert"
        >
          <p className="text-sm font-medium text-red-300">Ο χάρτης δεν φορτώθηκε</p>
          <p className="text-xs text-white/60">{errorMessage ?? 'Άγνωστο σφάλμα'}</p>
        </div>
      )}
    </div>
  );
}
