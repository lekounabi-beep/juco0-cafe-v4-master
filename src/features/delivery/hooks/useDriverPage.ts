/**
 * Driver Page orchestration hook
 * All delivery UI state derives from activeDeliveryView → deliveryUi.
 */

import { useEffect, useState, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { useDriverInitialization } from './useDriverInitialization';
import { useWakeLock } from './useWakeLock';
import { useDriverRealtime } from './useDriverRealtime';
import { useDriverAvailability } from './useDriverAvailability';
import { useGPS } from './useGPS';
import { requestGeolocationPermission } from '../services/gps.service';
import {
  getDriverGpsState,
  resetDriverGpsState,
  subscribeDriverGps,
} from '@/features/maps/core/driver-gps-feed';
import { useDriverMapBridge } from './useDriverMapBridge';
import {
  type DriverDeliveryState,
  INITIAL_DRIVER_DELIVERY_STATE,
  resetDriverDeliveryState,
} from '../state/driver-delivery-state';
import { useETA } from './useETA';
import { useOrderDestination } from './useOrderDestination';
import { useDriverStore } from '../store/driver-store';
import {
  runDeliveryTransitionWithOffline,
} from '../services/driver-offline-actions';
import { safeAcceptOrder, withAcceptTimeout, type AcceptResult } from '../services/safe-accept-order';
import { isNetworkOnline } from '../services/offline-queue.service';
import { getOptimisticDelivery } from '../services/driver-offline-state';
import {
  getActiveDelivery,
  reconcileDriverStoreAvailability,
  type ActiveDeliveryView,
} from '../utils/active-delivery';
import {
  selectDeliveryUi,
  type DeliveryUiState,
} from '../utils/delivery-ui-selector';
import type { DriverProfile } from '../types/delivery.types';
import { speedFromKmh } from '../services/speed.service';

const MIN_ETA_SPEED_MS = speedFromKmh(5);
const FALLBACK_ETA_SPEED_MS = speedFromKmh(25);

type Order = {
  id: string;
  order_number: string;
  status: string;
  items: { name: string; qty: number }[];
  total: number;
  address: string;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
};

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
  driverPosition: { lat: number; lng: number } | null;
  driverHeading: number;
  isWakeLockActive: boolean;
  handleAvailabilityChange: (newAvailability: string) => Promise<void>;
  handleAcceptOrder: (orderId: string) => Promise<void>;
  handleDeliveryAction: (action: string) => Promise<void>;
  locationPermissionModalOpen: boolean;
  setLocationPermissionModalOpen: (open: boolean) => void;
  handleRetryLocationPermission: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshActiveDelivery: () => Promise<boolean>;
}

export function useDriverPage(): UseDriverPageReturn {
  const driver = useDriverStore((s) => s.driver);

  const {
    loading,
    error,
    driverProfile,
    availableOrders,
    activeDelivery,
    serverConfirmedNoActive,
    refreshOrders,
    refreshActiveDelivery,
  } = useDriverInitialization();

  const { availabilityStatus: storeAvailability, setAvailability, loading: availabilityLoading } =
    useDriverAvailability();

  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [driverDeliveryState, setDriverDeliveryState] = useState<DriverDeliveryState>(
    INITIAL_DRIVER_DELIVERY_STATE
  );
  const [locationPermissionModalOpen, setLocationPermissionModalOpen] = useState(false);

  const permissionPromiseRef = useRef<Promise<'granted' | 'denied' | 'unsupported'> | null>(null);
  const restoredAssignmentRef = useRef<string | null>(null);

  const activeDeliveryView = useMemo(
    () => getActiveDelivery(driver, activeDelivery?.order, activeDelivery),
    [driver, activeDelivery]
  );

  const deliveryUi = useMemo(
    () => selectDeliveryUi(activeDeliveryView, storeAvailability, driverDeliveryState),
    [activeDeliveryView, storeAvailability, driverDeliveryState]
  );

  const { destination: mapDestination, resolving: destinationResolving } = useOrderDestination(
    deliveryUi.isOnDelivery ? activeDeliveryView.order : null
  );

  const availabilityStatus = deliveryUi.availability;
  const gpsTrackingAllowed = deliveryUi.canTrackGps;

  const { isWakeLockActive } = useWakeLock(deliveryUi.isOnDelivery);

  const handleRealtimeDataRefresh = useCallback(() => {
    if (deliveryUi.isOnDelivery) {
      void refreshActiveDelivery();
    } else {
      void refreshOrders();
    }
  }, [deliveryUi.isOnDelivery, refreshActiveDelivery, refreshOrders]);

  useDriverRealtime({ onOrderUpdate: handleRealtimeDataRefresh });

  const driverGps = useSyncExternalStore(subscribeDriverGps, getDriverGpsState, getDriverGpsState);
  const driverPosition = driverGps.driverPosition;
  const driverHeading = driverGps.driverHeading;
  const gpsDestination = mapDestination;

  const handleGpsPermissionDenied = useCallback(() => {
    setDriverDeliveryState((s) => ({ ...s, permission: 'denied', gpsReady: false }));
    setLocationPermissionModalOpen(true);
  }, []);

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
    deliveryId:
      gpsTrackingAllowed && activeDeliveryView.assignment?.id
        ? activeDeliveryView.assignment.id
        : null,
    driverId: gpsTrackingAllowed && driver?.id ? driver.id : null,
    onPermissionDenied: handleGpsPermissionDenied,
    onError: (err) => {
      if (err.message !== 'Location permission denied') {
        console.error('GPS error:', err);
      }
    },
  });

  const ensureGeolocationPermission = useCallback(async () => {
    if (permissionPromiseRef.current) {
      return permissionPromiseRef.current;
    }

    setDriverDeliveryState((s) => ({ ...s, permission: 'pending' }));

    const promise = requestGpsPermission().finally(() => {
      permissionPromiseRef.current = null;
    });
    permissionPromiseRef.current = promise;

    const result = await promise;
    const permission = result === 'granted' ? 'granted' : 'denied';
    setDriverDeliveryState((s) => ({ ...s, permission }));
    return result;
  }, [requestGpsPermission]);

  useDriverMapBridge({
    destination: mapDestination ?? deliveryUi.destination,
    activeDeliveryId: deliveryUi.isOnDelivery
      ? activeDeliveryView.assignment?.id ?? null
      : null,
    stage: deliveryUi.isOnDelivery ? deliveryUi.stage : null,
  });

  const averageSpeedMs = useMemo(() => {
    const rawSpeed = lastLocation?.speed ?? 0;
    if (rawSpeed >= MIN_ETA_SPEED_MS) return rawSpeed;
    const stats = getSpeedStats();
    if (stats && stats.averageSpeed >= MIN_ETA_SPEED_MS) return stats.averageSpeed;
    return FALLBACK_ETA_SPEED_MS;
  }, [lastLocation, getSpeedStats]);

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
      resetDriverGpsState();
    }
  }, [deliveryUi.isOnDelivery, stopGPSTracking]);

  useEffect(() => {
    if (loading) return;

    const hasOptimistic = !!(driver?.id && getOptimisticDelivery(driver.id));
    const storePatch = reconcileDriverStoreAvailability(storeAvailability, deliveryUi, {
      loading,
      assignmentLoading,
      hasOptimistic,
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
  ]);

  useEffect(() => {
    if (loading || !driver?.id) return;
    if (storeAvailability === 'busy' && !deliveryUi.isOnDelivery) {
      void refreshActiveDelivery();
    }
  }, [loading, driver?.id, storeAvailability, deliveryUi.isOnDelivery, refreshActiveDelivery]);

  useEffect(() => {
    const assignmentId = activeDeliveryView.assignment?.id;
    if (!assignmentId || !driver?.id || !deliveryUi.isOnDelivery || driverDeliveryState.isPickingUp) {
      return;
    }

    if (driverDeliveryState.permission === 'denied') return;

    if (driverDeliveryState.permission === 'granted') {
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
      if (result !== 'granted') {
        setLocationPermissionModalOpen(true);
        return;
      }
      setDriverDeliveryState((s) => ({ ...s, permission: 'granted', gpsReady: true }));
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
    activeDeliveryView.assignment?.id,
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
      await setAvailability(newAvailability as 'online' | 'offline');
    } catch (err) {
      console.error('Failed to update availability:', err);
    }
  };

  const handleRetryLocationPermission = useCallback(async () => {
    const result = await ensureGeolocationPermission();
    if (result !== 'granted') return;

    setDriverDeliveryState((s) => ({ ...s, gpsReady: true }));
    setLocationPermissionModalOpen(false);

    const assignmentId = activeDeliveryView.assignment?.id;
    if (assignmentId && driver?.id && deliveryUi.gpsActive) {
      await startGPSTracking({
        skipPermissionRequest: true,
        deliveryId: assignmentId,
        driverId: driver.id,
      });
    }
  }, [
    ensureGeolocationPermission,
    activeDeliveryView.assignment?.id,
    driver?.id,
    deliveryUi.gpsActive,
    startGPSTracking,
  ]);

  const refreshAfterAccept = useCallback(async () => {
    try {
      await Promise.all([
        withAcceptTimeout('refreshActiveDelivery', refreshActiveDelivery(), 5_000),
        withAcceptTimeout('refreshOrders', refreshOrders(), 5_000),
      ]);
    } catch (err) {
      console.warn('[ACCEPT] post-accept refresh failed:', err);
    }
  }, [refreshActiveDelivery, refreshOrders]);

  const handleAcceptOrder = async (orderId: string) => {
    if (!driver || assignmentLoading) return;

    const orderSnapshot = availableOrders.find((o) => o.id === orderId);
    if (!orderSnapshot) {
      toast.error('Order not found');
      return;
    }

    setAssignmentLoading(true);
    setAcceptingOrderId(orderId);

    let result: AcceptResult = { ok: false, reason: 'Accept flow did not complete' };

    try {
      result = await safeAcceptOrder(orderId, driver.id, orderSnapshot);
    } catch (err) {
      console.log('[ACCEPT_CATCH_ERROR]', err);
      result = {
        ok: false,
        reason: err instanceof Error ? err.message : 'Failed to accept order',
      };
    } finally {
      setAssignmentLoading(false);
      setAcceptingOrderId(null);
      console.log('[ACCEPT_FINALLY]', { orderId, result });
    }

    if (result.ok) {
      if (result.state === 'queued') {
        toast.message('Παραγγελία αποθηκεύτηκε — θα συγχρονιστεί όταν επανέλθει η σύνδεση');
      } else if (result.state === 'synced_existing') {
        toast.message('Έχετε ήδη ενεργή παράδοση');
      } else {
        toast.success('Η παραγγελία αποδέχθηκε');
      }

      void refreshAfterAccept();
      void requestGeolocationPermission().then((permissionResult) => {
        if (permissionResult === 'granted') {
          setDriverDeliveryState((s) => ({ ...s, permission: 'granted' }));
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

    if (action === 'picked_up') {
      if (driverDeliveryState.isPickingUp || permissionPromiseRef.current) return;

      setDriverDeliveryState((s) => ({ ...s, isPickingUp: true, permission: 'pending' }));

      try {
        const result = await ensureGeolocationPermission();
        if (result !== 'granted') {
          setDriverDeliveryState((s) => ({ ...s, isPickingUp: false }));
          setLocationPermissionModalOpen(true);
          return;
        }

        setDriverDeliveryState((s) => ({ ...s, permission: 'granted', gpsReady: true }));

        const ok = await runDeliveryTransitionWithOffline(
          action,
          assignmentId,
          orderId,
          driver.id
        );
        if (!ok) {
          toast.error('Failed to update delivery status');
          setDriverDeliveryState((s) => ({
            ...s,
            isPickingUp: false,
            gpsReady: false,
            permission: 'pending',
          }));
          return;
        }

        await refreshActiveDelivery();
        restoredAssignmentRef.current = assignmentId;

        await startGPSTracking({
          skipPermissionRequest: true,
          deliveryId: assignmentId,
          driverId: driver.id,
        });
      } catch (err) {
        console.error('Failed to complete pickup:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to complete pickup');
        setDriverDeliveryState((s) => ({ ...s, isPickingUp: false }));
      } finally {
        setDriverDeliveryState((s) => ({ ...s, isPickingUp: false }));
      }
      return;
    }

    try {
      const ok = await runDeliveryTransitionWithOffline(
        action,
        assignmentId,
        orderId,
        driver.id
      );
      if (!ok) {
        toast.error('Failed to update delivery status');
        return;
      }

      if (action === 'delivered') {
        if (isNetworkOnline()) {
          await setAvailability('online');
        } else {
          useDriverStore.getState().setAvailabilityStatus('online');
        }
        setDriverDeliveryState(resetDriverDeliveryState());
        resetDriverGpsState();
        restoredAssignmentRef.current = null;
        stopGPSTracking();
      }

      await refreshActiveDelivery();
    } catch (err) {
      console.error('Failed to update delivery status:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update delivery status');
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
    driverPosition,
    driverHeading,
    isWakeLockActive,
    handleAvailabilityChange,
    handleAcceptOrder,
    handleDeliveryAction,
    locationPermissionModalOpen,
    setLocationPermissionModalOpen,
    handleRetryLocationPermission,
    refreshOrders,
    refreshActiveDelivery,
  };
}
