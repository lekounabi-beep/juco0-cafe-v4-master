/**
 * TrackingMap — snapshot producer + RAF render loop consumer.
 * Map attaches once; GPS updates enqueue only when snapshot content changes.
 */

'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { mapEngine } from '@/features/maps/engine/MapEngine';
import { buildMapSnapshot } from '@/features/maps/core/map-snapshot-engine';
import { snapshotContentFingerprint } from '@/features/maps/core/map-snapshot-convergence';
import {
  attachMapRenderLoop,
  detachMapRenderLoop,
  enqueueMapSnapshot,
  getMapRenderLoopDebug,
} from '@/features/maps/core/map-render-loop';
import { getRendererDebugState } from '@/features/maps/core/render-map-from-snapshot';
import { getStableCameraDebug } from '@/features/maps/core/stable-camera-controller';
import type { TrackingMapSnapshotInput } from '@/features/maps/core/map-snapshot.types';
import { googleMapsLoader } from '@/integrations/google-maps/loader';

const IS_DEV = process.env.NODE_ENV === 'development';

export type TrackingMapDebug = {
  realtimeConnected?: boolean;
  lastGpsAgeMs?: number | null;
};

type TrackingMapProps = {
  snapshotInput: TrackingMapSnapshotInput;
  debug?: TrackingMapDebug;
};

async function loadMaps(): Promise<boolean> {
  if (window.google?.maps) return true;
  try {
    await googleMapsLoader.load();
  } catch (error) {
    console.error('[TrackingMap] Google Maps load failed', error);
    return false;
  }
  return !!window.google?.maps;
}

export function TrackingMap({ snapshotInput, debug }: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initGenRef = useRef(0);
  const mountedRef = useRef(true);
  const mapRef = useRef<google.maps.Map | null>(null);
  const lastEnqueuedFpRef = useRef<string | null>(null);
  const [, setMapReady] = useState(false);

  const snapshot = useMemo(
    () =>
      buildMapSnapshot({
        mapProjectionReady: true,
        stage: snapshotInput.stage,
        driverLat: snapshotInput.driverLat,
        driverLng: snapshotInput.driverLng,
        driverHeading: snapshotInput.driverHeading,
        destinationLat: snapshotInput.destinationLat,
        destinationLng: snapshotInput.destinationLng,
        storeLat: snapshotInput.storeLat,
        storeLng: snapshotInput.storeLng,
        routePoints: snapshotInput.routePoints,
        gpsReady: snapshotInput.gpsReady,
      }),
    [
      snapshotInput.stage,
      snapshotInput.driverLat,
      snapshotInput.driverLng,
      snapshotInput.driverHeading,
      snapshotInput.destinationLat,
      snapshotInput.destinationLng,
      snapshotInput.storeLat,
      snapshotInput.storeLng,
      snapshotInput.gpsReady,
      snapshotInput.routePoints,
    ]
  );

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const gen = ++initGenRef.current;
    lastEnqueuedFpRef.current = null;

    void (async () => {
      const container = containerRef.current;
      if (!container || !(await loadMaps()) || initGenRef.current !== gen) return;

      try {
        await mapEngine.attach(container);
        if (initGenRef.current !== gen || !mountedRef.current) return;
        const map = mapEngine.getMap();
        if (!map) return;

        attachMapRenderLoop(map);
        mapRef.current = map;
        setMapReady(true);
      } catch (error) {
        console.error('[TrackingMap] Map init failed', error);
      }
    })();

    return () => {
      mountedRef.current = false;
      initGenRef.current += 1;
      const map = mapRef.current ?? mapEngine.getMap();
      if (map) detachMapRenderLoop(map);
      if (mapEngine.isReady()) mapEngine.detach();
      mapRef.current = null;
      lastEnqueuedFpRef.current = null;
      setMapReady(false);
    };
  }, []);

  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const fp = snapshotContentFingerprint(snapshot);
    if (fp === lastEnqueuedFpRef.current) return;

    lastEnqueuedFpRef.current = fp;
    enqueueMapSnapshot(map, snapshot);
  }, [snapshot]);

  const mapInstance = mapRef.current;
  const rendererDebug = mapInstance ? getRendererDebugState(mapInstance) : null;
  const cameraDebug = mapInstance ? getStableCameraDebug(mapInstance) : null;
  const loopDebug = mapInstance ? getMapRenderLoopDebug(mapInstance) : null;

  return (
    <div className="relative h-full min-h-[400px] w-full">
      <div
        ref={setContainerRef}
        data-map-container="true"
        className="absolute inset-0 h-full w-full min-h-[400px]"
      />
      {IS_DEV && (
        <div className="pointer-events-none absolute left-2 top-2 z-50 max-w-[220px] rounded bg-black/80 p-2 font-mono text-[10px] leading-relaxed text-white">
          <div className="mb-1 font-bold text-emerald-400">MAP RENDER LOOP</div>
          projection: {String(loopDebug?.projectionReady ?? false)}
          <br />
          stage: {snapshot.stage}
          <br />
          driver: {snapshot.driver.lat?.toFixed(5) ?? '—'},{' '}
          {snapshot.driver.lng?.toFixed(5) ?? '—'}
          <br />
          dest: {snapshot.destination.lat?.toFixed(5) ?? '—'},{' '}
          {snapshot.destination.lng?.toFixed(5) ?? '—'}
          <br />
          frames: {loopDebug?.frameCount ?? 0} skipped: {loopDebug?.skippedFrames ?? 0}
          <br />
          conv: {loopDebug?.lastSkipReason ?? 'ok'} gps:{' '}
          {String(loopDebug?.gpsStabilizeReady ?? true)} 1st:{' '}
          {String(loopDebug?.firstFrameCommitted ?? false)}
          <br />
          renders: {cameraDebug?.renderCycleCount ?? 0}
          <br />
          marker: {String(rendererDebug?.markerAlive ?? false)}
          <br />
          route: {String(rendererDebug?.polylineAlive ?? false)}
          <br />
          realtime: {String(debug?.realtimeConnected ?? 'n/a')}
          <br />
          gps age:{' '}
          {debug?.lastGpsAgeMs != null ? `${Math.round(debug.lastGpsAgeMs / 1000)}s` : 'n/a'}
        </div>
      )}
    </div>
  );
}
