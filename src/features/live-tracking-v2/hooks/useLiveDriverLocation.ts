'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackV2Realtime } from '../telemetry/tracking-v2-telemetry';

export type LiveDriverLocation = {
  lat: number;
  lng: number;
};

type LocationRow = {
  lat: number;
  lng: number;
  recorded_at: string;
};

export type UseLiveDriverLocationResult = {
  location: LiveDriverLocation | null;
  loading: boolean;
  connected: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
};

function parseLocationRow(row: unknown): LocationRow | null {
  if (!row || typeof row !== 'object') return null;
  const record = row as Record<string, unknown>;
  const lat = Number(record.lat);
  const lng = Number(record.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const recordedAt = record.recorded_at;
  if (typeof recordedAt !== 'string' || !recordedAt) return null;

  return { lat, lng, recorded_at: recordedAt };
}

function getAssignmentIdFromPayload(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null;
  const id = (row as Record<string, unknown>).delivery_assignment_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function recordedAtMs(row: LocationRow): number {
  return new Date(row.recorded_at).getTime();
}

function pickLatestRow(rows: LocationRow[]): LocationRow | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) =>
    recordedAtMs(row) >= recordedAtMs(best) ? row : best
  );
}

function isNewerThan(row: LocationRow, other: LocationRow | null): boolean {
  if (!other) return true;
  return recordedAtMs(row) > recordedAtMs(other);
}

async function fetchLatestFromHistory(
  assignmentId: string
): Promise<{ latest: LocationRow | null; error: string | null }> {
  const { data, error } = await (supabase.rpc as any)('get_delivery_location_history', {
    p_assignment_id: assignmentId,
  });

  if (error) {
    return { latest: null, error: error.message ?? 'Failed to load location history' };
  }

  const rawRows = !data ? [] : Array.isArray(data) ? data : [data];
  const parsed: LocationRow[] = [];
  for (const row of rawRows) {
    const p = parseLocationRow(row);
    if (p) parsed.push(p);
  }

  return { latest: pickLatestRow(parsed), error: null };
}

export function useLiveDriverLocation(assignmentId: string): UseLiveDriverLocationResult {
  const [location, setLocation] = useState<LiveDriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const latestRecordedAtMsRef = useRef<number | null>(null);
  const seedCompleteRef = useRef(false);
  const pendingRealtimeRowRef = useRef<LocationRow | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;

    const isActive = () =>
      mountedRef.current && generation === generationRef.current;

    const safeSetLoading = (value: boolean) => {
      if (!isActive()) return;
      setLoading(value);
    };

    const safeSetConnected = (value: boolean) => {
      if (!isActive()) return;
      setConnected(value);
    };

    const safeSetError = (value: string | null) => {
      if (!isActive()) return;
      setError(value);
    };

    const safeClearErrorIfRealtime = () => {
      if (!isActive()) return;
      setError((prev) => (prev?.startsWith('Realtime') ? null : prev));
    };

    const resetSessionState = () => {
      latestRecordedAtMsRef.current = null;
      seedCompleteRef.current = false;
      pendingRealtimeRowRef.current = null;
      if (!isActive()) return;
      setLocation(null);
      setLoading(true);
      setConnected(false);
      setError(null);
      setLastUpdatedAt(null);
    };

    if (!assignmentId) {
      resetSessionState();
      safeSetLoading(false);
      safeSetError('Missing assignment ID');
      return () => {
        generationRef.current += 1;
      };
    }

    const currentAssignmentId = assignmentId;
    resetSessionState();

    const commitLatestRow = (row: LocationRow | null) => {
      if (!row || !isActive()) return;

      const t = recordedAtMs(row);
      if (!Number.isFinite(t)) return;
      if (latestRecordedAtMsRef.current != null && t <= latestRecordedAtMsRef.current) {
        trackV2Realtime('gps_update_dropped', {
          assignmentId: currentAssignmentId,
          recorded_at: row.recorded_at,
          reason: 'stale_or_duplicate',
        });
        return;
      }

      latestRecordedAtMsRef.current = t;
      setLocation({ lat: row.lat, lng: row.lng });
      setLastUpdatedAt(row.recorded_at);
      setError(null);
      trackV2Realtime('gps_update_committed', {
        assignmentId: currentAssignmentId,
        lat: row.lat,
        lng: row.lng,
        recorded_at: row.recorded_at,
      });
    };

    const queueOrCommitInsert = (row: LocationRow) => {
      if (!isActive()) return;

      if (!seedCompleteRef.current) {
        const pending = pendingRealtimeRowRef.current;
        if (!pending || isNewerThan(row, pending)) {
          pendingRealtimeRowRef.current = row;
        }
        return;
      }

      commitLatestRow(row);
    };

    void (async () => {
      try {
        const { latest, error: fetchError } = await fetchLatestFromHistory(currentAssignmentId);
        if (!isActive()) return;

        if (fetchError) {
          safeSetError(fetchError);
        } else {
          trackV2Realtime('gps_seed_received', {
            assignmentId: currentAssignmentId,
            hasLatest: latest != null,
            recorded_at: latest?.recorded_at ?? null,
          });
          commitLatestRow(latest);
        }

        if (!isActive()) return;

        const pending = pendingRealtimeRowRef.current;
        pendingRealtimeRowRef.current = null;

        if (pending && isNewerThan(pending, latest)) {
          commitLatestRow(pending);
        }
      } catch (err) {
        if (!isActive()) return;
        safeSetError(err instanceof Error ? err.message : 'Failed to load location');
      } finally {
        if (!isActive()) return;
        seedCompleteRef.current = true;
        safeSetLoading(false);
      }
    })();

    const channelName = `live-tracking-v2-locations-${currentAssignmentId}`;
    const filter = `delivery_assignment_id=eq.${currentAssignmentId}`;

    const resyncFromHistory = () => {
      trackV2Realtime('history_resync_started', { assignmentId: currentAssignmentId });
      void (async () => {
        try {
          const { latest, error: fetchError } = await fetchLatestFromHistory(currentAssignmentId);
          if (!isActive()) return;

          if (fetchError) {
            safeSetError(fetchError);
            trackV2Realtime('history_resync_completed', {
              assignmentId: currentAssignmentId,
              success: false,
              error: fetchError,
            });
            return;
          }

          commitLatestRow(latest);
          trackV2Realtime('history_resync_completed', {
            assignmentId: currentAssignmentId,
            success: true,
            hasLatest: latest != null,
          });
        } catch {
          trackV2Realtime('history_resync_completed', {
            assignmentId: currentAssignmentId,
            success: false,
          });
        }
      })();
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_locations',
          filter,
        },
        (payload) => {
          if (!isActive()) return;
          if (!payload.new) return;

          const rowAssignmentId = getAssignmentIdFromPayload(payload.new);
          if (rowAssignmentId !== currentAssignmentId) return;

          const parsed = parseLocationRow(payload.new);
          if (parsed) queueOrCommitInsert(parsed);
        }
      )
      .subscribe((status) => {
        if (!isActive()) return;

        if (status === 'SUBSCRIBED') {
          safeSetConnected(true);
          safeClearErrorIfRealtime();
          trackV2Realtime('connected', { assignmentId: currentAssignmentId });
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'CLOSED' ||
          status === 'TIMED_OUT'
        ) {
          safeSetConnected(false);
          trackV2Realtime('disconnected', { assignmentId: currentAssignmentId, status });
          if (status === 'CHANNEL_ERROR') {
            safeSetError('Realtime connection error');
          }
        }
      });

    const onOnline = () => {
      if (!isActive()) return;
      resyncFromHistory();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
      }

      void supabase.removeChannel(channel);

      generationRef.current += 1;
    };
  }, [assignmentId]);

  return {
    location,
    loading,
    connected,
    error,
    lastUpdatedAt,
  };
}
