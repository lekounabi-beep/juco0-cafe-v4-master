"use client";

/**
 * @deprecated Use useTrackingSession — V2 map receives GPS via session props.
 */

import { useEffect, useRef, useState } from "react";
import { getLocationHistoryForTrackingServer } from "@app/actions/tracking-delivery";
import { trackV2Realtime } from "../telemetry/tracking-v2-telemetry";

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

const POLL_INTERVAL_MS = 3000;

function parseLocationRow(row: unknown): LocationRow | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const lat = Number(record.lat);
  const lng = Number(record.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const recordedAt = record.recorded_at;
  if (typeof recordedAt !== "string" || !recordedAt) return null;

  return { lat, lng, recorded_at: recordedAt };
}

function recordedAtMs(row: LocationRow): number {
  return new Date(row.recorded_at).getTime();
}

function pickLatestRow(rows: LocationRow[]): LocationRow | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) => (recordedAtMs(row) >= recordedAtMs(best) ? row : best));
}

async function fetchLatestFromHistory(
  orderId: string,
  assignmentId: string,
): Promise<{ latest: LocationRow | null; error: string | null }> {
  try {
    const rawRows = await getLocationHistoryForTrackingServer(orderId, assignmentId);
    const parsed: LocationRow[] = [];
    for (const row of rawRows) {
      const p = parseLocationRow(row);
      if (p) parsed.push(p);
    }
    return { latest: pickLatestRow(parsed), error: null };
  } catch {
    return { latest: null, error: "Failed to load location history" };
  }
}

export function useLiveDriverLocation(
  assignmentId: string,
  orderId: string,
  options?: { enabled?: boolean },
): UseLiveDriverLocationResult {
  const enabled = options?.enabled !== false;

  const [location, setLocation] = useState<LiveDriverLocation | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const latestRecordedAtMsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLocation(null);
      setLoading(false);
      setConnected(false);
      setError(null);
      return;
    }

    if (!assignmentId || !orderId) {
      setLocation(null);
      setLoading(false);
      setConnected(false);
      setError(assignmentId ? "Missing order ID" : "Missing assignment ID");
      return;
    }

    let cancelled = false;
    latestRecordedAtMsRef.current = null;

    const commitLatestRow = (row: LocationRow | null) => {
      if (!row || cancelled) return;

      const t = recordedAtMs(row);
      if (!Number.isFinite(t)) return;
      if (latestRecordedAtMsRef.current != null && t <= latestRecordedAtMsRef.current) {
        return;
      }

      latestRecordedAtMsRef.current = t;
      setLocation({ lat: row.lat, lng: row.lng });
      setLastUpdatedAt(row.recorded_at);
      setError(null);
      trackV2Realtime("gps_update_committed", {
        assignmentId,
        lat: row.lat,
        lng: row.lng,
        recorded_at: row.recorded_at,
      });
    };

    const poll = async () => {
      const { latest, error: fetchError } = await fetchLatestFromHistory(orderId, assignmentId);
      if (cancelled) return;

      if (fetchError) {
        setError(fetchError);
        setConnected(false);
      } else {
        commitLatestRow(latest);
        setConnected(true);
        trackV2Realtime("gps_seed_received", {
          assignmentId,
          hasLatest: latest != null,
          recorded_at: latest?.recorded_at ?? null,
        });
      }
      setLoading(false);
    };

    void poll();
    const intervalId = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      setConnected(false);
    };
  }, [assignmentId, orderId, enabled]);

  return {
    location,
    loading,
    connected,
    error,
    lastUpdatedAt,
  };
}
