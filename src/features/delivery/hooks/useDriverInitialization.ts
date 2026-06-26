/**
 * Driver initialization hook
 * Loads driver profile from localStorage session (UUID) + server actions (service role).
 * Active delivery: delivery_assignments via fetchDriverActiveDelivery.
 * Accept pool: fetchAcceptableOrdersForDriver (only when no active assignment).
 */

import { useEffect, useState, useCallback } from "react";
import { useDriverStore } from "@/features/delivery/store/driver-store";
import { getDriverProfileById } from "../../../../app/actions/driver-login";
import { fetchDriverActiveDelivery } from "../../../../app/actions/driver-delivery-sync";
import { fetchAcceptableOrdersForDriver } from "../../../../app/actions/driver-orders";
import { clearDriverSession, getDriverSession } from "@/lib/auth/driver-session";
import { isUUID } from "@/shared/utils/uuid";
import type { DriverProfile } from "../types/delivery.types";

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

type DeliveryAssignment = {
  id: string;
  order_id: string;
  driver_id: string;
  status: string;
  assigned_at?: string;
  accepted_at?: string | null;
  picked_up_at?: string | null;
  started_delivery_at?: string | null;
  arrived_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  order?: Order;
};

const INIT_TIMEOUT_MS = 20_000;

function redirectToDriverLogin(): void {
  if (typeof window === "undefined") return;
  window.location.replace("/driver/login");
}

function withInitTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Driver init timed out")), INIT_TIMEOUT_MS);
    }),
  ]);
}

interface UseDriverInitializationReturn {
  loading: boolean;
  error: string | null;
  driverProfile: DriverProfile | null;
  availableOrders: Order[];
  activeDelivery: DeliveryAssignment | null;
  serverConfirmedNoActive: boolean;
  refreshOrders: () => Promise<void>;
  refreshActiveDelivery: () => Promise<boolean>;
  removeAvailableOrder: (orderId: string) => void;
}

export function useDriverInitialization(): UseDriverInitializationReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<DeliveryAssignment | null>(null);
  const [serverConfirmedNoActive, setServerConfirmedNoActive] = useState(false);

  const fetchAvailableOrders = useCallback(async (driverId: string) => {
    if (!isUUID(driverId)) return;

    try {
      const result = await fetchAcceptableOrdersForDriver(driverId);
      if (!result.success) {
        console.error("[Driver] Failed to fetch acceptable orders:", result.error);
        setAvailableOrders([]);
        return;
      }
      setAvailableOrders(result.orders as Order[]);
    } catch (err) {
      console.error("[Driver] Failed to fetch acceptable orders:", err);
      setAvailableOrders([]);
    }
  }, []);

  const fetchActiveDeliveryFromDB = useCallback(async (driverId: string): Promise<boolean> => {
    if (!isUUID(driverId)) {
      console.error("Invalid driver_id detected", driverId);
      setServerConfirmedNoActive(false);
      return false;
    }

    try {
      const result = await fetchDriverActiveDelivery(driverId);

      if (!result.success) {
        console.error("[Driver] Server active delivery fetch failed:", result.error);
        setServerConfirmedNoActive(false);
        return false;
      }

      if (result.assignment) {
        const assignment = result.assignment as DeliveryAssignment;
        setActiveDelivery(assignment);
        setAvailableOrders([]);
        setServerConfirmedNoActive(false);
        return true;
      }

      setActiveDelivery(null);
      setServerConfirmedNoActive(true);
      return false;
    } catch (err) {
      console.error("Failed to fetch active delivery:", err);
      setServerConfirmedNoActive(false);
      return false;
    }
  }, []);

  const refreshActiveDelivery = useCallback(async (): Promise<boolean> => {
    const driverId = useDriverStore.getState().driver?.id;
    if (!driverId || !isUUID(driverId)) return false;
    const hasActive = await fetchActiveDeliveryFromDB(driverId);
    if (!hasActive) {
      await fetchAvailableOrders(driverId);
    }
    return hasActive;
  }, [fetchActiveDeliveryFromDB, fetchAvailableOrders]);

  const refreshOrders = useCallback(async () => {
    const driverId = useDriverStore.getState().driver?.id;
    if (!driverId || !isUUID(driverId)) return;
    await fetchAvailableOrders(driverId);
  }, [fetchAvailableOrders]);

  const removeAvailableOrder = useCallback((orderId: string) => {
    setAvailableOrders((prev) => prev.filter((order) => order.id !== orderId));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const session = getDriverSession();
        if (!session) {
          return;
        }

        if (!isUUID(session.driver_id)) {
          console.error("Invalid driver_id detected", session.driver_id);
          clearDriverSession();
          redirectToDriverLogin();
          return;
        }

        await withInitTimeout(
          (async () => {
            const profile = await getDriverProfileById(session.driver_id);
            if (cancelled) return;

            if (!profile) {
              clearDriverSession();
              redirectToDriverLogin();
              return;
            }

            setDriverProfile(profile);
            useDriverStore.getState().setDriver(profile);

            const hasActiveDelivery = await fetchActiveDeliveryFromDB(profile.id);
            if (cancelled) return;

            if (!hasActiveDelivery) {
              await fetchAvailableOrders(profile.id);
              if (cancelled) return;
              useDriverStore.getState().setAvailabilityStatus(profile.availability_status);
            }
          })(),
        );
      } catch (err) {
        if (cancelled) return;
        console.error("[Driver] Failed to initialize:", err);
        setError(
          err instanceof Error && err.message === "Driver init timed out"
            ? "Η σύνδεση καθυστέρησε — δοκίμασε ξανά"
            : "Failed to load driver",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [fetchAvailableOrders, fetchActiveDeliveryFromDB]);

  return {
    loading,
    error,
    driverProfile,
    availableOrders,
    activeDelivery,
    serverConfirmedNoActive,
    refreshOrders,
    refreshActiveDelivery,
    removeAvailableOrder,
  };
}
