/**
 * Consolidated customer tracking session — single poll, single server round-trip.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getTrackingSessionServer } from "@app/actions/tracking-session";
import { computeDeliveryState } from "@/features/delivery/core/compute-delivery-state";
import { calculateETA } from "@/features/delivery/services/eta.service";
import { speedFromKmh } from "@/features/delivery/services/speed.service";
import { orderCoordinates } from "@/shared/utils/order-fields";
import { playNotificationSound } from "@/features/notifications/services/notification-sound.service";
import {
  evaluatePollTick,
  connectionStateFromContext,
  isDocumentHidden,
  TRACKING_POLL_INTERVAL_MS,
} from "@/features/tracking/core/poll-coordinator";
import {
  latestLocationFromRows,
  mergeMonotonicLocations,
} from "@/features/tracking/core/tracking-session-merge";
import { isTerminalOrder } from "@/features/tracking/core/terminal-order";
import { trackSessionTelemetry } from "@/features/tracking/core/tracking-session-telemetry";
import { trailPointsSignature } from "@/features/live-tracking-v2/utils/driver-trail-geojson";
import type { DeliveryLocationRow } from "@/features/delivery/core/delivery-state.types";
import type {
  TrackingAssignment,
  TrackingDriver,
  TrackingOrder,
} from "@/features/tracking/hooks/useCustomerTrackingSync";
import type {
  TrackingConnectionState,
  UseTrackingSessionResult,
} from "@/features/tracking/types/tracking-session.types";

const FALLBACK_ETA_SPEED_MS = speedFromKmh(25);

function assignmentMilestoneReached(
  prev: TrackingAssignment | null,
  next: TrackingAssignment,
): boolean {
  return (
    (!prev?.picked_up_at && !!next.picked_up_at) ||
    (!prev?.started_delivery_at && !!next.started_delivery_at) ||
    (!prev?.arrived_at && !!next.arrived_at) ||
    (!prev?.delivered_at && !!next.delivered_at)
  );
}

const EMPTY_DELIVERY_STATE = computeDeliveryState({
  order: null,
  assignment: null,
  locations: [],
  role: "customer",
});

export function useTrackingSession(orderId: string): UseTrackingSessionResult {
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [assignment, setAssignment] = useState<TrackingAssignment | null>(null);
  const [driver, setDriver] = useState<TrackingDriver | null>(null);
  const [locations, setLocations] = useState<DeliveryLocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<TrackingConnectionState>("idle");
  const [lastPollAt, setLastPollAt] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const orderRef = useRef<TrackingOrder | null>(null);
  orderRef.current = order;

  const assignmentRef = useRef<TrackingAssignment | null>(null);
  assignmentRef.current = assignment;

  const locationsRef = useRef<DeliveryLocationRow[]>([]);
  locationsRef.current = locations;

  const errorRef = useRef<string | null>(null);
  errorRef.current = error;

  const loadInFlightRef = useRef(false);
  const terminalRef = useRef(false);
  const gpsBootstrappedForRef = useRef<string | null>(null);
  const forceBootstrapRef = useRef(true);
  const pollTimerRef = useRef<number | null>(null);

  const isTerminal = useMemo(() => isTerminalOrder(order), [order]);

  const deliveryState = useMemo(
    () =>
      computeDeliveryState({
        order,
        assignment,
        locations,
        role: "customer",
      }),
    [order, assignment, locations],
  );

  const latestLocation = useMemo(() => latestLocationFromRows(locations), [locations]);

  const timeline = useMemo(
    () => ({
      customerStep: deliveryState.customerStep,
      orderStatus: order?.status ?? "pending",
      deliveryStatus: order?.delivery_status ?? deliveryState.deliveryStatus,
    }),
    [deliveryState.customerStep, deliveryState.deliveryStatus, order],
  );

  const showDriverOnMap = timeline.customerStep === "on_the_way";
  const destination = useMemo(() => orderCoordinates(order), [order]);

  const eta = useMemo(() => {
    if (!showDriverOnMap || !latestLocation || !destination) return null;
    return calculateETA(latestLocation, destination, FALLBACK_ETA_SPEED_MS);
  }, [showDriverOnMap, latestLocation, destination]);

  const routePointsCacheRef = useRef<{
    signature: string;
    points: typeof deliveryState.routePoints;
  }>({ signature: "0", points: [] });

  const routePoints = useMemo(() => {
    const next = deliveryState.routePoints;
    const signature = trailPointsSignature(next);
    if (signature === routePointsCacheRef.current.signature) {
      return routePointsCacheRef.current.points;
    }
    routePointsCacheRef.current = { signature, points: next };
    return next;
  }, [deliveryState.routePoints]);

  const updateConnectionState = useCallback((hasError: boolean, isPolling: boolean) => {
    setConnectionState(
      connectionStateFromContext({
        isTerminal: terminalRef.current,
        documentHidden: isDocumentHidden(),
        hasError,
        isPolling,
      }),
    );
  }, []);

  const runPoll = useCallback(
    async (options?: {
      playMilestoneSound?: boolean;
      silent?: boolean;
      forceBootstrap?: boolean;
    }) => {
      if (!orderId || loadInFlightRef.current) return;

      if (options?.forceBootstrap) {
        forceBootstrapRef.current = true;
      }

      const currentOrder = orderRef.current;
      const currentAssignmentId = assignmentRef.current?.id ?? null;

      const decision = evaluatePollTick({
        orderId,
        order: currentOrder,
        assignmentId: currentAssignmentId,
        documentHidden: isDocumentHidden(),
        loadInFlight: false,
        gpsBootstrappedForAssignment: gpsBootstrappedForRef.current,
        forceBootstrap: forceBootstrapRef.current,
      });

      if (decision.action === "skip" && !options?.forceBootstrap) {
        trackSessionTelemetry("poll_skipped", { reason: decision.reason });
        if (decision.reason === "terminal") {
          terminalRef.current = true;
          trackSessionTelemetry("poll_stopped", { reason: "terminal" });
        }
        if (decision.reason === "hidden") {
          trackSessionTelemetry("poll_paused", { reason: "hidden" });
        }
        updateConnectionState(!!errorRef.current, false);
        return;
      }

      if (terminalRef.current && !options?.forceBootstrap) {
        return;
      }

      loadInFlightRef.current = true;
      const startedAt = performance.now();

      const gpsMode =
        decision.action === "poll"
          ? decision.gpsMode
          : options?.forceBootstrap && currentAssignmentId
            ? "bootstrap"
            : "none";

      if (decision.action === "poll" && decision.forceBootstrap) {
        forceBootstrapRef.current = true;
      }

      trackSessionTelemetry("poll_started", { gpsMode });
      updateConnectionState(!!errorRef.current, true);

      try {
        const payload = await getTrackingSessionServer(orderId, { gpsMode });

        if (!payload?.order) {
          if (!options?.silent) {
            setError("Order not found");
          }
          updateConnectionState(true, false);
          return;
        }

        const nextOrder = payload.order;
        setOrder(nextOrder);
        setAssignment(payload.assignment);
        setDriver(payload.driver);
        setError(null);

        if (isTerminalOrder(nextOrder)) {
          terminalRef.current = true;
          trackSessionTelemetry("poll_stopped", { reason: "terminal" });
        }

        if (
          payload.assignment &&
          assignmentMilestoneReached(assignmentRef.current, payload.assignment)
        ) {
          if (options?.playMilestoneSound) {
            const next = payload.assignment;
            void playNotificationSound("delivery", {
              eventId: `${next.id}-${next.picked_up_at ?? ""}-${next.started_delivery_at ?? ""}-${next.arrived_at ?? ""}-${next.delivered_at ?? ""}`,
              orderId,
            });
          }
        }

        if (payload.gps.mode === "bootstrap" && payload.assignment?.id) {
          const { locations: merged, stats } = mergeMonotonicLocations([], payload.gps.trail);
          setLocations(merged);
          gpsBootstrappedForRef.current = payload.assignment.id;
          forceBootstrapRef.current = false;
          trackSessionTelemetry("gps_merge", { ...stats, mode: "bootstrap" });
        } else if (payload.gps.mode === "latest" && payload.gps.trail.length > 0) {
          const { locations: merged, stats } = mergeMonotonicLocations(
            locationsRef.current,
            payload.gps.trail,
          );
          setLocations(merged);
          if (payload.assignment?.id) {
            gpsBootstrappedForRef.current = payload.assignment.id;
          }
          trackSessionTelemetry("gps_merge", { ...stats, mode: "latest" });
        } else if (!payload.assignment?.id) {
          setLocations([]);
          gpsBootstrappedForRef.current = null;
          forceBootstrapRef.current = false;
        }

        const now = new Date().toISOString();
        setLastPollAt(now);
        setPollCount((c) => c + 1);
        trackSessionTelemetry("poll_completed", {
          durationMs: Math.round(performance.now() - startedAt),
          gpsMode: payload.gps.mode,
        });
        updateConnectionState(false, false);
      } catch {
        if (!options?.silent) {
          setError("Failed to load order");
        }
        updateConnectionState(true, false);
      } finally {
        loadInFlightRef.current = false;
        setLoading(false);
      }
    },
    [orderId, updateConnectionState],
  );

  const runPollRef = useRef(runPoll);
  runPollRef.current = runPoll;

  const refresh = useCallback(async () => {
    terminalRef.current = false;
    forceBootstrapRef.current = true;
    await runPollRef.current({ playMilestoneSound: false, forceBootstrap: true });
  }, []);

  useEffect(() => {
    terminalRef.current = false;
    forceBootstrapRef.current = true;
    gpsBootstrappedForRef.current = null;
    setLoading(true);
    setError(null);
    setOrder(null);
    setAssignment(null);
    setDriver(null);
    setLocations([]);
    setPollCount(0);
    setLastPollAt(null);

    void runPollRef.current({ playMilestoneSound: false });

    pollTimerRef.current = window.setInterval(() => {
      void runPollRef.current({ playMilestoneSound: true, silent: true });
    }, TRACKING_POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible" && !terminalRef.current) {
        trackSessionTelemetry("poll_resumed", { reason: "visibility" });
        void runPollRef.current({ playMilestoneSound: true, silent: true });
      }
    };

    const onOnline = () => {
      if (!terminalRef.current) {
        trackSessionTelemetry("poll_resumed", { reason: "online" });
        forceBootstrapRef.current = true;
        void runPollRef.current({
          playMilestoneSound: true,
          silent: true,
          forceBootstrap: true,
        });
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [orderId]);

  return {
    order,
    assignment,
    driver,
    locations,
    latestLocation,
    deliveryState: order ? deliveryState : EMPTY_DELIVERY_STATE,
    routePoints,
    eta,
    timeline,
    connectionState,
    isTerminal,
    loading,
    error,
    refresh,
    lastPollAt,
    pollCount,
  };
}
