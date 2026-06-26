/**
 * Canonical GPS read path — delivery_locations ONLY.
 * Shared by customer and driver UIs with monotonic recorded_at guards.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  parseDeliveryLocationRow,
  shouldAcceptLocationRow,
} from './compute-delivery-state';
import type { DeliveryLocationRow } from './delivery-state.types';
import { forensicCoord, forensicLog } from '@/features/maps/debug/map-forensic-logger';
import { estimateJsonBytes, trackMapDataBytes } from '@/features/maps/debug/map-data-usage';

export type CanonicalLocationsDebug = {
  realtimeConnected: boolean;
  lastGpsAgeMs: number | null;
  locationCount: number;
};

function mergeMonotonicRows(rows: DeliveryLocationRow[]): DeliveryLocationRow[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );
  const out: DeliveryLocationRow[] = [];
  let lastMs: number | null = null;
  for (const row of sorted) {
    if (!shouldAcceptLocationRow(row, lastMs)) continue;
    lastMs = new Date(row.recorded_at).getTime();
    out.push(row);
  }
  return out;
}

export function useCanonicalDeliveryLocations(assignmentId: string | null | undefined): {
  locations: DeliveryLocationRow[];
  debug: CanonicalLocationsDebug;
} {
  const [locations, setLocations] = useState<DeliveryLocationRow[]>([]);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastGpsAt, setLastGpsAt] = useState<number | null>(null);
  const lastRecordedAtMsRef = useRef<number | null>(null);
  const seedCompleteRef = useRef(false);
  const pendingRealtimeRef = useRef<DeliveryLocationRow[]>([]);

  const commitMerged = useCallback((rows: DeliveryLocationRow[]) => {
    const merged = mergeMonotonicRows(rows);
    lastRecordedAtMsRef.current =
      merged.length > 0
        ? new Date(merged[merged.length - 1]!.recorded_at).getTime()
        : null;
    if (merged.length > 0) {
      setLastGpsAt(Date.now());
    }
    setLocations(merged);
    const last = merged[merged.length - 1];
    forensicLog('shared', 'db', 'locations_merged', {
      count: merged.length,
      latest: last ? forensicCoord(last.lat, last.lng) : '—',
      recordedAt: last?.recorded_at,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[GPS] locations merged', {
        count: merged.length,
        latest: last ?? null,
      });
    }
  }, []);

  const appendLocation = useCallback((row: DeliveryLocationRow) => {
    if (!seedCompleteRef.current) {
      pendingRealtimeRef.current.push(row);
      return true;
    }

    if (!shouldAcceptLocationRow(row, lastRecordedAtMsRef.current)) return false;

    const t = new Date(row.recorded_at).getTime();
    lastRecordedAtMsRef.current = t;
    setLastGpsAt(Date.now());
    setLocations((prev) => [...prev, row]);
    forensicLog('shared', 'db', 'location_append', {
      coord: forensicCoord(row.lat, row.lng),
      recordedAt: row.recorded_at,
      total: 'pending',
    });
    return true;
  }, []);

  const applyRow = useCallback(
    (row: unknown) => {
      const parsed = parseDeliveryLocationRow(row);
      if (!parsed) return null;
      appendLocation(parsed);
      return parsed;
    },
    [appendLocation]
  );

  useEffect(() => {
    lastRecordedAtMsRef.current = null;
    seedCompleteRef.current = false;
    pendingRealtimeRef.current = [];
    setLocations([]);
    setLastGpsAt(null);
  }, [assignmentId]);

  // Seed full ordered trail before applying live realtime (prevents race truncation).
  useEffect(() => {
    if (!assignmentId) return;
    let cancelled = false;

    void (async () => {
      try {
        const { data, error } = await (supabase.rpc as any)('get_delivery_location_history', {
          p_assignment_id: assignmentId,
        });
        if (cancelled) return;

        const rawRows = error || !data ? [] : Array.isArray(data) ? data : [data];
        trackMapDataBytes('gpsDownload', estimateJsonBytes(rawRows));
        const parsed: DeliveryLocationRow[] = [];
        for (const row of rawRows) {
          const p = parseDeliveryLocationRow(row);
          if (p) parsed.push(p);
        }

        if (cancelled) return;

        seedCompleteRef.current = true;
        const pending = pendingRealtimeRef.current;
        pendingRealtimeRef.current = [];
        commitMerged([...parsed, ...pending]);
      } catch {
        if (!cancelled) {
          seedCompleteRef.current = true;
          const pending = pendingRealtimeRef.current;
          pendingRealtimeRef.current = [];
          if (pending.length > 0) {
            commitMerged(pending);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assignmentId, commitMerged]);

  useEffect(() => {
    if (!assignmentId) {
      setRealtimeConnected(false);
      return;
    }

    const filter = `delivery_assignment_id=eq.${assignmentId}`;
    const channel = supabase
      .channel(`canonical-locations-${assignmentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_locations',
          filter,
        },
        (payload) => {
          if (payload.new) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[GPS] realtime location append', payload.new);
            }
            trackMapDataBytes('realtime', estimateJsonBytes(payload.new));
            applyRow(payload.new);
          }
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

  return {
    locations,
    debug: {
      realtimeConnected,
      lastGpsAgeMs: lastGpsAt != null ? Date.now() - lastGpsAt : null,
      locationCount: locations.length,
    },
  };
}
