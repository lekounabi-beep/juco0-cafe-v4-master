/**
 * Customer map snapshot — same engine inputs as driver.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { appendTrailIfValid } from '@/features/maps/utils/trail';
import { normalizeMapPoint } from '@/features/maps/utils/normalize-coordinates';
import {
  trackingStageToMapStage,
  type TrackingStage,
} from '@/features/maps/core/map-snapshot.types';

export type CustomerDriverPosition = {
  lat: number;
  lng: number;
  heading: number;
  accuracy?: number;
};

function parseRow(row: unknown): CustomerDriverPosition | null {
  try {
    const record = row as Record<string, unknown> | null;
    if (!record || typeof record !== 'object') return null;
    const point = normalizeMapPoint({ lat: record.lat, lng: record.lng });
    if (!point) return null;
    const heading = Number(record.heading);
    const accuracy = Number(record.accuracy);
    return {
      lat: point.lat,
      lng: point.lng,
      heading: Number.isFinite(heading) ? heading : 0,
      accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
    };
  } catch {
    return null;
  }
}

function toTrackingStage(deliveryStatus: string | undefined): TrackingStage {
  if (deliveryStatus === 'picked_up') return 'picked_up';
  if (deliveryStatus === 'in_transit') return 'in_transit';
  if (deliveryStatus === 'arrived') return 'arrived';
  if (deliveryStatus === 'assigned') return 'assigned';
  return null;
}

export function useCustomerMapSnapshot(
  assignmentId: string | null | undefined,
  destination: { lat: number; lng: number } | null,
  deliveryStatus: string | undefined
): {
  snapshotInput: {
    stage: ReturnType<typeof trackingStageToMapStage>;
    driverLat: number | null;
    driverLng: number | null;
    driverHeading: number;
    destinationLat: number | null;
    destinationLng: number | null;
    storeLat: null;
    storeLng: null;
    routePoints: { lat: number; lng: number }[];
    gpsReady: boolean;
  };
  debug: { realtimeConnected: boolean; lastGpsAgeMs: number | null };
} {
  const [position, setPosition] = useState<CustomerDriverPosition | null>(null);
  const [trail, setTrail] = useState<{ lat: number; lng: number }[]>([]);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastGpsAt, setLastGpsAt] = useState<number | null>(null);
  const trailRef = useRef<{ lat: number; lng: number }[]>([]);

  const stage = toTrackingStage(deliveryStatus);
  const stageRef = useRef<TrackingStage>(null);
  stageRef.current = stage;

  const dest = normalizeMapPoint(destination);

  const applyPosition = useCallback((next: CustomerDriverPosition) => {
    setPosition(next);
    setLastGpsAt(Date.now());

    const trailEligible =
      stageRef.current === 'picked_up' ||
      stageRef.current === 'in_transit' ||
      stageRef.current === 'arrived';

    if (trailEligible) {
      const updated = appendTrailIfValid(
        trailRef.current,
        { lat: next.lat, lng: next.lng },
        next.accuracy
      );
      trailRef.current = updated;
      setTrail(updated);
    }
  }, []);

  const applyRow = useCallback(
    (row: unknown) => {
      const next = parseRow(row);
      if (!next) return null;
      applyPosition(next);
      return next;
    },
    [applyPosition]
  );

  useEffect(() => {
    trailRef.current = [];
    setTrail([]);
    setPosition(null);
    setLastGpsAt(null);
  }, [assignmentId, stage]);

  useEffect(() => {
    if (!assignmentId) return;

    void (async () => {
      try {
        const { data, error } = await (supabase.rpc as any)('get_latest_delivery_location', {
          p_assignment_id: assignmentId,
        });
        if (error || !data) return;
        const row = Array.isArray(data) ? data[0] : data;
        applyRow(row);
      } catch {
        // optional
      }
    })();
  }, [assignmentId, applyRow]);

  useEffect(() => {
    if (!assignmentId) {
      setRealtimeConnected(false);
      return;
    }

    const filter = `delivery_assignment_id=eq.${assignmentId}`;
    const channel = supabase
      .channel(`customer-tracking-${assignmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_locations',
          filter,
        },
        (payload) => {
          applyRow(payload.new ?? payload.old ?? payload);
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      setRealtimeConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [assignmentId, applyRow]);

  const snapshotInput = useMemo(
    () => ({
      stage: trackingStageToMapStage(stage),
      driverLat: position?.lat ?? null,
      driverLng: position?.lng ?? null,
      driverHeading: position?.heading ?? 0,
      destinationLat: dest?.lat ?? null,
      destinationLng: dest?.lng ?? null,
      storeLat: null,
      storeLng: null,
      routePoints: trail,
      gpsReady: position != null,
    }),
    [
      stage,
      position?.lat,
      position?.lng,
      position?.heading,
      dest?.lat,
      dest?.lng,
      trail.length,
      trail[trail.length - 1]?.lat,
      trail[trail.length - 1]?.lng,
    ]
  );

  const debug = useMemo(
    () => ({
      realtimeConnected,
      lastGpsAgeMs: lastGpsAt != null ? Date.now() - lastGpsAt : null,
    }),
    [realtimeConnected, lastGpsAt]
  );

  return { snapshotInput, debug };
}

/** @deprecated Use useCustomerMapSnapshot */
export function useCustomerTrackingMapState(
  assignmentId: string | null | undefined,
  destination: { lat: number; lng: number } | null,
  deliveryStatus: string | undefined
) {
  const { snapshotInput, debug } = useCustomerMapSnapshot(
    assignmentId,
    destination,
    deliveryStatus
  );
  return {
    mapState: {
      driverPosition:
        snapshotInput.driverLat != null
          ? { lat: snapshotInput.driverLat, lng: snapshotInput.driverLng! }
          : null,
      destination:
        snapshotInput.destinationLat != null
          ? { lat: snapshotInput.destinationLat, lng: snapshotInput.destinationLng! }
          : null,
      trail: snapshotInput.routePoints,
      heading: snapshotInput.driverHeading,
      gpsReady: snapshotInput.gpsReady,
      mapReady: false,
      storeLocation: null,
      stage: deliveryStatus === 'assigned' ? 'assigned' : stageFromStatus(deliveryStatus),
    },
    debug,
  };
}

function stageFromStatus(status: string | undefined): TrackingStage {
  return toTrackingStage(status);
}

export function useCustomerDeliveryLocation(assignmentId: string | null | undefined) {
  const { snapshotInput, debug } = useCustomerMapSnapshot(assignmentId, null, undefined);
  return {
    position:
      snapshotInput.driverLat != null
        ? {
            lat: snapshotInput.driverLat,
            lng: snapshotInput.driverLng!,
            heading: snapshotInput.driverHeading,
          }
        : null,
    debug,
  };
}
