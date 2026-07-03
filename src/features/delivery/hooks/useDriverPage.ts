/**
 * Driver Page orchestration hook
 * All delivery UI state derives from activeDeliveryView → deliveryUi.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { storeLocation } from "@/config/map-defaults";
import { useDeliveryState } from "@/features/delivery/hooks/useDeliveryState";
import { useDriverInitialization } from "./useDriverInitialization";
import { useWakeLock } from "./useWakeLock";
import { useDriverRealtime } from "./useDriverRealtime";
import { useDriverAvailability } from "./useDriverAvailability";
import { useGPS } from "./useGPS";
import { requestGeolocationPermission } from "../services/gps.service";
import {
  type DriverDeliveryState,
  INITIAL_DRIVER_DELIVERY_STATE,
  resetDriverDeliveryState,
} from "../state/driver-delivery-state";
import { useETA } from "./useETA";
import { useOrderDestination } from "./useOrderDestination";
import { useDriverStore } from "../store/driver-store";
import { runDeliveryTransitionWithOffline } from "../services/driver-offline-actions";
import {
  safeAcceptOrder,
  withAcceptTimeout,
  type AcceptResult,
} from "../services/safe-accept-order";
import {
  isNetworkOnline,
  syncOfflineQueue,
  resetOfflineQueueSync,
} from "../services/offline-queue.service";
import { clearDriverRefreshInFlight } from "../services/driver-refresh-inflight";
import {
  getActiveDelivery,
  reconcileDriverStoreAvailability,
  type ActiveDeliveryView,
} from "../utils/active-delivery";
import { selectDeliveryUi, type DeliveryUiState } from "../utils/delivery-ui-selector";
import type { DriverProfile } from "../types/delivery.types";
import { speedFromKmh } from "../services/speed.service";
import { orderCoordinates } from "@/shared/utils/order-fields";
import { isUUID } from "@/shared/utils/uuid";
import {
  attachForensicToWindow,
  forensicCoord,
  forensicLog,
} from "@/features/maps/debug/map-forensic-logger";
import { setPwaDeliveryActive } from "@/lib/pwa-update-guard";
import { useDriverNetworkCoordinator } from "@/hooks/useDriverNetworkCoordinator";
import { registerDriverReconnectHandlers } from "@/lib/network/driver-network";
import { realtimeService } from "@/integrations/supabase/services/realtime.service";

const MIN_ETA_SPEED_MS = speedFromKmh(5);
const FALLBACK_ETA_SPEED_MS = speedFromKmh(25);

import type { DriverOrderDetails } from "../types/driver-order.types";

type Order = DriverOrderDetails;

interface UseDriverPageReturn {
  loading: boolean;
  error: string | null;
  availabilityLoading: boolean;
  driverProfile: DriverProfile | null;
  availabilityStatus: string;
  availableOrders: Order[];
  activeDeliveryView: ActiveDeliveryView;
  deliveryUi: DeliveryUiState;
  driverDeliveryState: DriverDeliveryState;
  assignmentLoading: boolean;
  acceptingOrderId: string | null;
  isGPSTracking: boolean;
  etaResult: ReturnType<typeof useETA>;
  mapDestination: { lat: number; lng: number } | null;
  destinationResolving: boolean;
  hasMapDestination: boolean;
  driverPosition: { lat: number; lng: number } | null;
  routePoints: { lat: number; lng: number }[];
  showDriverTrail: boolean;
  driverHeading: number;
  isWakeLockActive: boolean;
  handleAvailabilityChange: (newAvailability: string) => Promise<void>;
  handleAcceptOrder: (orderId: string) => Promise<void>;
  handleDeliveryAction: (action: string) => Promise<void>;
  deliveryActionLoading: boolean;
  locationPermissionModalOpen: boolean;
  setLocationPermissionModalOpen: (open: boolean) => void;
  handleRetryLocationPermission: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshActiveDelivery: () => Promise<boolean>;
}

export function useDriverPage(): UseDriverPageReturn {
  const driver = useDriverStore((s) => s.driver);
  const { isRefreshAllowed, shouldSkipRealtime } = useDriverNetworkCoordinator();

  const {
    loading,
    error,
    driverProfile,
    availableOrders,
    activeDelivery,
    serverConfirmedNoActive,
    refreshOrders,
    refreshActiveDelivery,
    removeAvailableOrder,
  } = useDriverInitialization();

  const {
    availabilityStatus: storeAvailability,
    setAvailability,
    loading: availabilityLoading,
  } = useDriverAvailability();

  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [deliveryActionLoading, setDeliveryActionLoading] = useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [driverDeliveryState, setDriverDeliveryState] = useState<DriverDeliveryState>(
    INITIAL_DRIVER_DELIVERY_STATE,
  );
  const [locationPermissionModalOpen, setLocationPermissionModalOpen] = useState(false);

  const permissionPromiseRef = useRef<Promise<"granted" | "denied" | "unsupported"> | null>(null);
  const restoredAssignmentRef = useRef<string | null>(null);

  const activeDeliveryView = useMemo(
    () => getActiveDelivery(driver, activeDelivery?.order, activeDelivery),
    [driver, activeDelivery],
  );

  const deliveryUi = useMemo(
    () => selectDeliveryUi(activeDeliveryView, storeAvailability, driverDeliveryState),
    [activeDeliveryView, storeAvailability, driverDeliveryState],
  );

  const { destination: mapDestination, resolving: destinationResolving } = useOrderDestination(
    deliveryUi.isOnDelivery ? activeDeliveryView.order : null,
  );

  const availabilityStatus = deliveryUi.availability;
  const gpsTrackingAllowed = deliveryUi.canTrackGps;

  const { isWakeLockActive } = useWakeLock(deliveryUi.isOnDelivery);

  useEffect(() => {
    setPwaDeliveryActive(deliveryUi.isOnDelivery);
    return () => setPwaDeliveryActive(false);
  }, [deliveryUi.isOnDelivery]);

  const refreshActiveDeliveryRef = useRef(refreshActiveDelivery);
  const refreshOrdersRef = useRef(refreshOrders);
  refreshActiveDeliveryRef.current = refreshActiveDelivery;
  refreshOrdersRef.current = refreshOrders;

  useEffect(() => {
    return registerDriverReconnectHandlers({
      reconnectRealtime: () => realtimeService.reconnectNow(),
      syncOfflineQueue: () => syncOfflineQueue(),
      refreshActiveDelivery: () => refreshActiveDeliveryRef.current(),
      refreshOrders: () => refreshOrdersRef.current(),
      abortStaleRefreshes: () => clearDriverRefreshInFlight("reconnect"),
      resetOfflineSync: () => resetOfflineQueueSync(),
    });
  }, []);

  const handleRealtimeDataRefresh = useCallback(() => {
    if (shouldSkipRealtime || !isRefreshAllowed) return;
    if (!isNetworkOnline()) return;
    if (deliveryUi.isOnDelivery) {
      void refreshActiveDelivery();
      return;
    }
    void refreshActiveDelivery().then((hasActive) => {
      if (!hasActive) {
        void refreshOrders();
      }
    });
  }, [
    shouldSkipRealtime,
    isRefreshAllowed,
    deliveryUi.isOnDelivery,
    refreshActiveDelivery,
    refreshOrders,
  ]);

  useDriverRealtime({ onOrderUpdate: handleRealtimeDataRefresh });

  const { deliveryState, locationDebug } = useDeliveryState({
    order: deliveryUi.isOnDelivery ? activeDeliveryView.order : null,
    assignment: deliveryUi.isOnDelivery ? activeDeliveryView.assignment : null,
    role: "driver",
    storeLocation,
  });

  const hasMapDestination =
    orderCoordinates(activeDeliveryView.order) != null || mapDestination != null;

  const handleGpsPermissionDenied = useCallback(() => {
    setDriverDeliveryState((s) => ({ ...s, permission: "denied", gpsReady: false }));
    setLocationPermissionModalOpen(true);
  }, []);

  const persistedAssignmentId =
    activeDeliveryView.assignment?.id && isUUID(activeDeliveryView.assignment.id)
      ? activeDeliveryView.assignment.id
      : null;

  const {
    isTracking: isGPSTracking,
    lastLocation,
    startTracking: startGPSTracking,
    stopTracking: stopGPSTracking,
    requestPermission: requestGpsPermission,
    getLastKnownPosition,
    fetchCurrentPosition,
    getSpeedStats,
  } = useGPS({
    deliveryId: gpsTrackingAllowed && persistedAssignmentId ? persistedAssignmentId : null,
    driverId: gpsTrackingAllowed && driver?.id ? driver.id : null,
    onPermissionDenied: handleGpsPermissionDenied,
    onError: (err) => {
      if (err.message !== "Location permission denied") {
        console.error("GPS error:", err);
      }
    },
  });

  const ensureGeolocationPermission = useCallback(async () => {
    if (permissionPromiseRef.current) {
      return permissionPromiseRef.current;
    }

    setDriverDeliveryState((s) => ({ ...s, permission: "pending" }));

    const promise = requestGpsPermission().finally(() => {
      permissionPromiseRef.current = null;
    });
    permissionPromiseRef.current = promise;

    const result = await promise;
    const permission = result === "granted" ? "granted" : "denied";
    setDriverDeliveryState((s) => ({ ...s, permission }));
    return result;
  }, [requestGpsPermission]);

  const averageSpeedMs = useMemo(() => {
    const rowSpeed = deliveryState.driverPosition?.speed;
    if (rowSpeed != null && rowSpeed >= MIN_ETA_SPEED_MS) return rowSpeed;
    const rawSpeed = lastLocation?.speed ?? 0;
    if (rawSpeed >= MIN_ETA_SPEED_MS) return rawSpeed;
    const stats = getSpeedStats();
    if (stats && stats.averageSpeed >= MIN_ETA_SPEED_MS) return stats.averageSpeed;
    return FALLBACK_ETA_SPEED_MS;
  }, [deliveryState.driverPosition?.speed, lastLocation, getSpeedStats]);

  useEffect(() => {
    attachForensicToWindow();
    const live = lastLocation?.coordinates;
    const source = isGPSTracking && live ? "device" : deliveryState.driverPosition ? "db" : "none";
    forensicLog("driver", "delivery_state", "driver_position_resolved", {
      source,
      customerStep: deliveryState.customerStep,
      deliveryStatus: deliveryState.deliveryStatus,
      device: forensicCoord(live?.lat, live?.lng),
      db: forensicCoord(deliveryState.driverPosition?.lat, deliveryState.driverPosition?.lng),
      isGPSTracking,
    });
  }, [
    deliveryState.customerStep,
    deliveryState.deliveryStatus,
    deliveryState.driverPosition,
    isGPSTracking,
    lastLocation,
  ]);

  const driverPosition = useMemo(() => {
    const live = lastLocation?.coordinates;
    if (isGPSTracking && live) return { lat: live.lat, lng: live.lng };
    if (deliveryState.driverPosition) {
      return { lat: deliveryState.driverPosition.lat, lng: deliveryState.driverPosition.lng };
    }
    return null;
  }, [isGPSTracking, lastLocation, deliveryState.driverPosition]);

  const driverHeading =
    isGPSTracking && lastLocation
      ? lastLocation.heading
      : (deliveryState.driverPosition?.heading ?? 0);

  const gpsDestination = mapDestination;

  const eta = useETA({
    currentLocation: driverPosition,
    destination: gpsDestination ?? mapDestination,
    averageSpeedMs,
  });

  useEffect(() => {
    if (!deliveryUi.isOnDelivery) {
      setDriverDeliveryState(resetDriverDeliveryState());
      restoredAssignmentRef.current = null;
      stopGPSTracking();
    }
  }, [deliveryUi.isOnDelivery, stopGPSTracking]);

  useEffect(() => {
    if (loading) return;
    if (!isRefreshAllowed) return;

    const storePatch = reconcileDriverStoreAvailability(storeAvailability, deliveryUi, {
      loading,
      assignmentLoading,
      hasOptimistic: false,
      serverConfirmedNoActive,
    });
    if (storePatch) {
      useDriverStore.getState().setAvailabilityStatus(storePatch);
    }
  }, [
    storeAvailability,
    deliveryUi,
    loading,
    assignmentLoading,
    driver?.id,
    serverConfirmedNoActive,
    isRefreshAllowed,
  ]);

  useEffect(() => {
    if (loading || !driver?.id || !isNetworkOnline() || !isRefreshAllowed) return;
    if (storeAvailability === "busy" && !deliveryUi.isOnDelivery) {
      void refreshActiveDelivery();
    }
  }, [
    loading,
    driver?.id,
    storeAvailability,
    deliveryUi.isOnDelivery,
    refreshActiveDelivery,
    isRefreshAllowed,
  ]);

  useEffect(() => {
    const assignmentId = persistedAssignmentId;
    if (
      !assignmentId ||
      !driver?.id ||
      !deliveryUi.isOnDelivery ||
      driverDeliveryState.isPickingUp
    ) {
      return;
    }

    if (driverDeliveryState.permission === "denied") return;

    if (driverDeliveryState.permission === "granted") {
      if (!isGPSTracking) {
        void startGPSTracking({
          skipPermissionRequest: true,
          deliveryId: assignmentId,
          driverId: driver.id,
        });
      }
      return;
    }

    if (restoredAssignmentRef.current === assignmentId) return;
    restoredAssignmentRef.current = assignmentId;

    let cancelled = false;
    void (async () => {
      const result = await ensureGeolocationPermission();
      if (cancelled) return;
      if (result !== "granted") {
        setLocationPermissionModalOpen(true);
        return;
      }
      setDriverDeliveryState((s) => ({ ...s, permission: "granted", gpsReady: true }));
      await startGPSTracking({
        skipPermissionRequest: true,
        deliveryId: assignmentId,
        driverId: driver.id,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    persistedAssignmentId,
    driver?.id,
    deliveryUi.isOnDelivery,
    driverDeliveryState.permission,
    driverDeliveryState.isPickingUp,
    isGPSTracking,
    startGPSTracking,
    ensureGeolocationPermission,
  ]);

  const handleAvailabilityChange = async (newAvailability: string) => {
    if (deliveryUi.isOnDelivery) return;
    try {
      await setAvailability(newAvailability as "online" | "offline");
    } catch (err) {
      console.error("Failed to update availability:", err);
    }
  };

  const handleRetryLocationPermission = useCallback(async () => {
    const result = await ensureGeolocationPermission();
    if (result !== "granted") return;

    setDriverDeliveryState((s) => ({ ...s, gpsReady: true }));
    setLocationPermissionModalOpen(false);

    if (persistedAssignmentId && driver?.id && deliveryUi.gpsActive) {
      await startGPSTracking({
        skipPermissionRequest: true,
        deliveryId: persistedAssignmentId,
        driverId: driver.id,
      });
    }
  }, [
    ensureGeolocationPermission,
    persistedAssignmentId,
    driver?.id,
    deliveryUi.gpsActive,
    startGPSTracking,
  ]);

  const refreshAfterAccept = useCallback(async () => {
    try {
      await Promise.all([
        withAcceptTimeout("refreshActiveDelivery", refreshActiveDelivery(), 5_000),
        withAcceptTimeout("refreshOrders", refreshOrders(), 5_000),
      ]);
    } catch (err) {
      console.warn("[ACCEPT] post-accept refresh failed:", err);
    }
  }, [refreshActiveDelivery, refreshOrders]);

  const handleAcceptOrder = async (orderId: string) => {
    if (!driver || assignmentLoading) return;

    const orderSnapshot = availableOrders.find((o) => o.id === orderId);
    if (!orderSnapshot) {
      toast.error("Order not found");
      return;
    }

    setAssignmentLoading(true);
    setAcceptingOrderId(orderId);

    let result: AcceptResult = { ok: false, reason: "Accept flow did not complete" };

    try {
      result = await safeAcceptOrder(orderId, driver.id, orderSnapshot);
    } catch (err) {
      console.log("[ACCEPT_CATCH_ERROR]", err);
      result = {
        ok: false,
        reason: err instanceof Error ? err.message : "Failed to accept order",
      };
    } finally {
      setAssignmentLoading(false);
      setAcceptingOrderId(null);
      console.log("[ACCEPT_FINALLY]", { orderId, result });
    }

    if (result.ok) {
      removeAvailableOrder(orderId);
      toast.success("Η παραγγελία αποδέχθηκε");

      void refreshAfterAccept();
      void requestGeolocationPermission().then((permissionResult) => {
        if (permissionResult === "granted") {
          setDriverDeliveryState((s) => ({ ...s, permission: "granted" }));
        }
      });
      return;
    }

    toast.error(result.reason);
    void refreshAfterAccept();
  };

  const handleDeliveryAction = async (action: string) => {
    if (!deliveryUi.isOnDelivery || !activeDeliveryView.assignment || !driver) return;

    const assignmentId = activeDeliveryView.assignment.id!;
    const orderId = activeDeliveryView.assignment.order_id!;
    const stage = activeDeliveryView.stage;

    const runStep = async (step: string): Promise<boolean> => {
      const result = await runDeliveryTransitionWithOffline(step, assignmentId, orderId, driver.id);
      if (!result.ok) {
        if (result.error === "offline_queued") {
          toast.message("Η ενέργεια αποθηκεύτηκε — θα συγχρονιστεί όταν επανέλθει η σύνδεση");
          return false;
        }
        toast.error(
          result.error === "transition_timeout"
            ? "Η σύνδεση καθυστέρησε — δοκίμασε ξανά"
            : "Αποτυχία ενημέρωσης κατάστασης",
        );
        return false;
      }
      await refreshActiveDelivery().catch(() => undefined);
      return true;
    };

    if (action === "picked_up") {
      if (driverDeliveryState.isPickingUp || permissionPromiseRef.current) return;

      setDriverDeliveryState((s) => ({ ...s, isPickingUp: true, permission: "pending" }));

      try {
        const result = await ensureGeolocationPermission();
        if (result !== "granted") {
          setDriverDeliveryState((s) => ({ ...s, isPickingUp: false }));
          setLocationPermissionModalOpen(true);
          return;
        }

        setDriverDeliveryState((s) => ({ ...s, permission: "granted", gpsReady: true }));

        const ok = await runStep("picked_up");
        if (!ok) {
          setDriverDeliveryState((s) => ({
            ...s,
            isPickingUp: false,
            gpsReady: false,
            permission: "pending",
          }));
          return;
        }

        const enRoute = await runStep("start_delivery");
        if (!enRoute) {
          toast.message("Η παραγγελία παραλήφθηκε επιτυχώς");
        }

        await refreshActiveDelivery().catch(() => undefined);
        restoredAssignmentRef.current = assignmentId;

        await startGPSTracking({
          skipPermissionRequest: true,
          deliveryId: assignmentId,
          driverId: driver.id,
        });
      } catch (err) {
        console.error("Failed to complete pickup:", err);
        toast.error(err instanceof Error ? err.message : "Failed to complete pickup");
        setDriverDeliveryState((s) => ({ ...s, isPickingUp: false }));
      } finally {
        setDriverDeliveryState((s) => ({ ...s, isPickingUp: false }));
      }
      return;
    }

    setDeliveryActionLoading(true);
    try {
      if ((action === "arrived" || action === "delivered") && stage === "picked_up") {
        const enRoute = await runStep("start_delivery");
        if (!enRoute) return;
      }

      if (action === "delivered") {
        const atDoor = await runStep("arrived");
        if (!atDoor) return;
      }

      const ok = await runStep(action);
      if (!ok) return;

      if (action === "arrived") {
        toast.success("Έφτασες στον πελάτη");
      }

      if (action === "delivered") {
        toast.success("Η παράδοση ολοκληρώθηκε");
        if (isNetworkOnline()) {
          await setAvailability("online");
        } else {
          useDriverStore.getState().setAvailabilityStatus("online");
        }
        setDriverDeliveryState(resetDriverDeliveryState());
        restoredAssignmentRef.current = null;
        stopGPSTracking();
      }

      void refreshActiveDelivery();
    } catch (err) {
      console.error("Failed to update delivery status:", err);
      toast.error(err instanceof Error ? err.message : "Αποτυχία ενημέρωσης");
    } finally {
      setDeliveryActionLoading(false);
    }
  };

  return {
    loading,
    error,
    availabilityLoading,
    driverProfile,
    availabilityStatus,
    availableOrders,
    activeDeliveryView,
    deliveryUi,
    driverDeliveryState,
    assignmentLoading,
    acceptingOrderId,
    isGPSTracking,
    etaResult: eta,
    mapDestination,
    destinationResolving,
    hasMapDestination,
    driverPosition,
    routePoints: deliveryState.routePoints,
    showDriverTrail: deliveryState.showDriverTrail,
    driverHeading,
    isWakeLockActive,
    handleAvailabilityChange,
    handleAcceptOrder,
    handleDeliveryAction,
    deliveryActionLoading,
    locationPermissionModalOpen,
    setLocationPermissionModalOpen,
    handleRetryLocationPermission,
    refreshOrders,
    refreshActiveDelivery,
  };
}
