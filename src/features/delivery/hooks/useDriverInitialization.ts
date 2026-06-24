/**
 * Driver initialization hook
 * Loads driver profile from localStorage session (UUID) + Supabase.
 * Active delivery always fetched via server action (RLS-safe).
 */

import { useEffect, useState, useCallback } from 'react';
import { useDriverStore } from '@/features/delivery/store/driver-store';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getAvailableOrdersForDrivers } from '@/integrations/supabase/services/delivery.service';
import { getDriverProfileById } from '../../../../app/actions/driver-login';
import { fetchDriverActiveDelivery } from '../../../../app/actions/driver-delivery-sync';
import { clearDriverSession, getDriverSession } from '@/lib/auth/driver-session';
import { isUUID } from '@/shared/utils/uuid';
import type { DriverProfile } from '../types/delivery.types';
import { getOptimisticDelivery } from '../services/driver-offline-state';

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

interface UseDriverInitializationReturn {
  loading: boolean;
  error: string | null;
  driverProfile: DriverProfile | null;
  availableOrders: Order[];
  activeDelivery: DeliveryAssignment | null;
  serverConfirmedNoActive: boolean;
  refreshOrders: () => Promise<void>;
  refreshActiveDelivery: () => Promise<boolean>;
}

export function useDriverInitialization(): UseDriverInitializationReturn {
  const { replaceWhenReady } = useSafeRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<DeliveryAssignment | null>(null);
  const [serverConfirmedNoActive, setServerConfirmedNoActive] = useState(false);

  const fetchAvailableOrders = useCallback(async () => {
    try {
      const orders = await getAvailableOrdersForDrivers();
      setAvailableOrders(orders as Order[]);
    } catch (err) {
      console.error('[Driver] Failed to fetch available orders:', err);
    }
  }, []);

  const fetchActiveDeliveryFromDB = useCallback(async (driverId: string): Promise<boolean> => {
    if (!isUUID(driverId)) {
      console.error('Invalid driver_id detected', driverId);
      setServerConfirmedNoActive(false);
      return false;
    }

    try {
      const result = await fetchDriverActiveDelivery(driverId);

      if (!result.success) {
        console.error('[Driver] Server active delivery fetch failed:', result.error);
        setServerConfirmedNoActive(false);
        return false;
      }

      if (result.assignment) {
        const assignment = result.assignment as DeliveryAssignment;
        setActiveDelivery((prev) => {
          return assignment;
        });
        setServerConfirmedNoActive(false);
        return true;
      }

      const optimistic = getOptimisticDelivery(driverId);
      if (optimistic) {
        setActiveDelivery({
          ...optimistic,
          status: optimistic.status,
        });
        setServerConfirmedNoActive(false);
        return true;
      }

      setActiveDelivery(null);
      setServerConfirmedNoActive(true);
      return false;
    } catch (err) {
      console.error('Failed to fetch active delivery:', err);
      setServerConfirmedNoActive(false);

      const optimistic = getOptimisticDelivery(driverId);
      if (optimistic) {
        setActiveDelivery({
          ...optimistic,
          status: optimistic.status,
        });
        return true;
      }
      return false;
    }
  }, []);

  const refreshActiveDelivery = useCallback(async (): Promise<boolean> => {
    const driverId = useDriverStore.getState().driver?.id;
    if (!driverId || !isUUID(driverId)) return false;
    return fetchActiveDeliveryFromDB(driverId);
  }, [fetchActiveDeliveryFromDB]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const session = getDriverSession();
      if (!session) {
        setLoading(false);
        return;
      }

      if (!isUUID(session.driver_id)) {
        console.error('Invalid driver_id detected', session.driver_id);
        clearDriverSession();
        if (!cancelled) {
          replaceWhenReady('/driver/login');
        }
        return;
      }

      try {
        const profile = await getDriverProfileById(session.driver_id);
        if (cancelled) return;

        if (!profile) {
          clearDriverSession();
          replaceWhenReady('/driver/login');
          return;
        }

        setDriverProfile(profile);
        useDriverStore.getState().setDriver(profile);

        await fetchAvailableOrders();
        if (cancelled) return;

        const hasActiveDelivery = await fetchActiveDeliveryFromDB(profile.id);
        if (cancelled) return;

        if (!hasActiveDelivery) {
          useDriverStore.getState().setAvailabilityStatus(profile.availability_status);
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('[Driver] Failed to initialize:', err);
        setError('Failed to load driver');
        setLoading(false);
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [fetchAvailableOrders, fetchActiveDeliveryFromDB, replaceWhenReady]);

  return {
    loading,
    error,
    driverProfile,
    availableOrders,
    activeDelivery,
    serverConfirmedNoActive,
    refreshOrders: fetchAvailableOrders,
    refreshActiveDelivery,
  };
}
