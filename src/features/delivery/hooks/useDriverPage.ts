/**
 * Driver Page orchestration hook
 * Combines all driver-related hooks and services into a single API
 */

import { useEffect, useState } from 'react';
import { useDriverInitialization } from './useDriverInitialization';
import { useWakeLock } from './useWakeLock';
import { useDriverRealtime } from './useDriverRealtime';
import { useDriverAvailability } from './useDriverAvailability';
import { useDriverAssignment } from './useDriverAssignment';
import { useDriverProfile } from './useDriverProfile';
import { useWorkflow } from './useWorkflow';
import { useGPS } from './useGPS';
import { useETA } from './useETA';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { ORDER_STATUS, DRIVER_AVAILABILITY } from '../types/delivery.types';
import type { Coordinates } from '@/shared/types/common.types';

type Order = {
  id: string;
  order_number: string;
  status: string;
  items: { name: string; qty: number }[];
  total: number;
  address: string;
  coords?: Coordinates;
  created_at: string;
};

type DriverProfile = {
  id: string;
  name: string;
  vehicle_type: string;
  phone: string;
  availability: string;
  total_deliveries: number;
};

type DeliveryAssignment = {
  id: string;
  order_id: string;
  status: string;
  order?: Order;
};

interface UseDriverPageReturn {
  // Loading and error states
  loading: boolean;
  error: string | null;
  availabilityLoading: boolean;
  
  // Driver data
  driverProfile: DriverProfile | null;
  availabilityStatus: string;
  
  // Orders and delivery
  availableOrders: Order[];
  activeDelivery: DeliveryAssignment | null;
  assignmentLoading: boolean;
  
  // GPS and ETA
  isGPSTracking: boolean;
  etaResult: any;
  
  // Wake lock
  isWakeLockActive: boolean;
  
  // Handlers
  handleAvailabilityChange: (newAvailability: string) => Promise<void>;
  handleAcceptOrder: (orderId: string) => Promise<void>;
  handleDeliveryAction: (action: string) => Promise<void>;
  
  // Refresh functions
  refreshOrders: () => Promise<void>;
  refreshActiveDelivery: () => Promise<void>;
}

export function useDriverPage(): UseDriverPageReturn {
  const { user } = useAuthStore();
  
  // Initialization
  const {
    loading,
    error,
    driverProfile,
    availableOrders,
    activeDelivery,
    refreshOrders,
    refreshActiveDelivery,
  } = useDriverInitialization();
  
  // Wake lock
  const { isWakeLockActive } = useWakeLock(activeDelivery);
  
  // Realtime
  useDriverRealtime({
    onOrderUpdate: () => {
      refreshOrders();
    },
  });
  
  // Driver hooks
  const { availabilityStatus, setAvailability, loading: availabilityLoading } = useDriverAvailability();
  const { acceptOrder, getActiveAssignments } = useDriverAssignment();
  const { transitionOrder } = useWorkflow();
  
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  
  // GPS and ETA
  const { isTracking: isGPSTracking, startTracking: startGPSTracking, stopTracking: stopGPSTracking } = useGPS({
    deliveryId: activeDelivery?.id || null,
    driverId: user?.id || null,
    onLocationUpdate: (update) => {
      console.log('GPS update:', update);
    },
    onError: (err) => {
      console.error('GPS error:', err);
    },
  });

  const etaResult = useETA({
    currentLocation: null,
    destination: activeDelivery?.order?.coords || null,
    averageSpeedMs: 0,
  });

  // GPS lifecycle management
  useEffect(() => {
    if (!activeDelivery) {
      stopGPSTracking();
      return;
    }

    // Start GPS when delivery is in transit
    if (activeDelivery.status === 'in_transit' && !isGPSTracking) {
      startGPSTracking();
    }

    // Stop GPS when delivered
    if (activeDelivery.status === 'delivered') {
      stopGPSTracking();
    }
  }, [activeDelivery, isGPSTracking, startGPSTracking, stopGPSTracking, user?.id]);

  // Handle availability change
  const handleAvailabilityChange = async (newAvailability: string) => {
    try {
      await setAvailability(newAvailability as any);
    } catch (err) {
      console.error('Failed to update availability:', err);
    }
  };

  // Handle accept order
  const handleAcceptOrder = async (orderId: string) => {
    try {
      setAssignmentLoading(true);
      await acceptOrder(orderId);
      // Refresh orders and active delivery after accepting
      await refreshOrders();
      await refreshActiveDelivery();
    } catch (err) {
      console.error('Failed to accept order:', err);
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Handle delivery action
  const handleDeliveryAction = async (action: string) => {
    if (!activeDelivery) return;

    try {
      switch (action) {
        case 'picked_up':
          await transitionOrder(activeDelivery.order_id, 'picked_up');
          break;
        case 'start_delivery':
          await transitionOrder(activeDelivery.order_id, 'in_transit');
          break;
        case 'arrived':
          await transitionOrder(activeDelivery.order_id, 'arrived');
          break;
        case 'delivered':
          await transitionOrder(activeDelivery.order_id, 'delivered');
          // Availability automatically returns to online
          break;
      }
    } catch (err) {
      console.error('Failed to update delivery status:', err);
    }
  };

  return {
    loading,
    error,
    availabilityLoading,
    driverProfile,
    availabilityStatus,
    availableOrders,
    activeDelivery,
    assignmentLoading,
    isGPSTracking,
    etaResult,
    isWakeLockActive,
    handleAvailabilityChange,
    handleAcceptOrder,
    handleDeliveryAction,
    refreshOrders,
    refreshActiveDelivery,
  };
}
