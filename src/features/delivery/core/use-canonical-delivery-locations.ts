/**

 * Canonical GPS read path — server-gated delivery_locations access.

 * Customer: requires order_access cookie (via orderId).

 * Driver: requires driver session (driverMode).

 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getLocationHistoryForTrackingServer,
  getLocationHistoryForDriverServer,
} from "@app/actions/tracking-delivery";

import { parseDeliveryLocationRow, shouldAcceptLocationRow } from "./compute-delivery-state";

import type { DeliveryLocationRow } from "./delivery-state.types";

import { forensicCoord, forensicLog } from "@/features/maps/debug/map-forensic-logger";

import { estimateJsonBytes, trackMapDataBytes } from "@/features/maps/debug/map-data-usage";

import {
  getPollRequestTimeoutMs,
  isDriverPollingAllowed,
  logDriverNetwork,
  onDriverPollingResumed,
  registerPollAbortController,
  unregisterPollAbortController,
} from "@/lib/network/driver-network";

import { AbortableTimeoutError, withAbortableTimeout } from "@/lib/network/with-abortable-timeout";

export type CanonicalLocationsDebug = {
  realtimeConnected: boolean;

  lastGpsAgeMs: number | null;

  locationCount: number;
};

const POLL_INTERVAL_MS = 3000;

function mergeMonotonicRows(rows: DeliveryLocationRow[]): DeliveryLocationRow[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
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

type CanonicalLocationsOptions = {
  orderId?: string | null;

  driverMode?: boolean;
};

export function useCanonicalDeliveryLocations(
  assignmentId: string | null | undefined,

  options?: CanonicalLocationsOptions,
): {
  locations: DeliveryLocationRow[];

  debug: CanonicalLocationsDebug;
} {
  const orderId = options?.orderId ?? null;

  const driverMode = options?.driverMode ?? false;

  const [locations, setLocations] = useState<DeliveryLocationRow[]>([]);

  const [pollingActive, setPollingActive] = useState(false);

  const [lastGpsAt, setLastGpsAt] = useState<number | null>(null);

  const lastRecordedAtMsRef = useRef<number | null>(null);

  const pollInFlightRef = useRef(false);

  const activeAbortRef = useRef<AbortController | null>(null);

  const commitMerged = useCallback((rows: DeliveryLocationRow[]) => {
    const merged = mergeMonotonicRows(rows);

    lastRecordedAtMsRef.current =
      merged.length > 0 ? new Date(merged[merged.length - 1]!.recorded_at).getTime() : null;

    if (merged.length > 0) {
      setLastGpsAt(Date.now());
    }

    setLocations(merged);

    const last = merged[merged.length - 1];

    forensicLog("shared", "db", "locations_merged", {
      count: merged.length,

      latest: last ? forensicCoord(last.lat, last.lng) : "—",

      recordedAt: last?.recorded_at,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[GPS] locations merged", {
        count: merged.length,

        latest: last ?? null,
      });
    }
  }, []);

  const fetchLocations = useCallback(async (): Promise<DeliveryLocationRow[]> => {
    if (!assignmentId) return [];

    let rawRows: unknown[] = [];

    if (driverMode) {
      rawRows = await getLocationHistoryForDriverServer(assignmentId);
    } else if (orderId) {
      rawRows = await getLocationHistoryForTrackingServer(orderId, assignmentId);
    } else {
      return [];
    }

    trackMapDataBytes("gpsDownload", estimateJsonBytes(rawRows));

    const parsed: DeliveryLocationRow[] = [];

    for (const row of rawRows) {
      const p = parseDeliveryLocationRow(row);

      if (p) parsed.push(p);
    }

    return parsed;
  }, [assignmentId, orderId, driverMode]);

  useEffect(() => {
    lastRecordedAtMsRef.current = null;

    setLocations([]);

    setLastGpsAt(null);

    setPollingActive(false);

    pollInFlightRef.current = false;

    activeAbortRef.current?.abort();

    activeAbortRef.current = null;
  }, [assignmentId, orderId, driverMode]);

  useEffect(() => {
    if (!assignmentId) return;

    if (!driverMode && !orderId) return;

    let cancelled = false;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const loadDriverHardened = async () => {
      if (pollInFlightRef.current) return;

      if (!isDriverPollingAllowed()) return;

      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      pollInFlightRef.current = true;

      const controller = new AbortController();

      activeAbortRef.current?.abort();

      activeAbortRef.current = controller;

      registerPollAbortController(controller);

      try {
        const parsed = await withAbortableTimeout(
          async (signal) => {
            if (signal.aborted) {
              throw new AbortableTimeoutError("abort", "canonical_poll");
            }

            return fetchLocations();
          },

          getPollRequestTimeoutMs(),

          controller.signal,

          {
            label: "canonical_poll",

            onTimeout: () => logDriverNetwork("request_timeout", { reason: "canonical_poll" }),

            onAbort: () => logDriverNetwork("request_aborted", { reason: "canonical_poll" }),
          },
        );

        if (cancelled || controller.signal.aborted) return;

        commitMerged(parsed);

        setPollingActive(true);
      } catch (err) {
        if (err instanceof AbortableTimeoutError) return;

        if (!cancelled) setPollingActive(false);
      } finally {
        unregisterPollAbortController(controller);

        if (activeAbortRef.current === controller) {
          activeAbortRef.current = null;
        }

        pollInFlightRef.current = false;
      }
    };

    const loadLegacy = async () => {
      try {
        const parsed = await fetchLocations();

        if (cancelled) return;

        commitMerged(parsed);

        setPollingActive(true);
      } catch {
        if (!cancelled) setPollingActive(false);
      }
    };

    const load = driverMode ? loadDriverHardened : loadLegacy;

    void load();

    if (driverMode) {
      intervalId = setInterval(() => {
        if (!isDriverPollingAllowed()) return;

        if (typeof navigator !== "undefined" && !navigator.onLine) return;

        void load();
      }, POLL_INTERVAL_MS);

      const unsubscribeResume = onDriverPollingResumed(() => {
        if (!cancelled) void load();
      });

      return () => {
        cancelled = true;

        if (intervalId) clearInterval(intervalId);

        activeAbortRef.current?.abort();

        activeAbortRef.current = null;

        pollInFlightRef.current = false;

        unsubscribeResume();

        setPollingActive(false);
      };
    }

    intervalId = setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;

      if (intervalId) clearInterval(intervalId);

      setPollingActive(false);
    };
  }, [assignmentId, orderId, driverMode, fetchLocations, commitMerged]);

  return {
    locations,

    debug: {
      realtimeConnected: pollingActive,

      lastGpsAgeMs: lastGpsAt != null ? Date.now() - lastGpsAt : null,

      locationCount: locations.length,
    },
  };
}
