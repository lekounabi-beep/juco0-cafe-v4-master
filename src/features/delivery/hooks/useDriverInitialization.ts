/**
 * Driver initialization hook
 * Handles authentication, driver verification, profile loading, and initial data fetching
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useDriverStore } from '@/features/delivery/store/driver-store';
import { getAvailableOrdersForDrivers } from '@/integrations/supabase/services/delivery.service';
import { supabase } from '@/integrations/supabase/client';

type DriverProfile = {
  id: string;
  name: string;
  vehicle_type: string;
  phone: string;
  availability: string;
  total_deliveries: number;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  items: { name: string; qty: number }[];
  total: number;
  address: string;
  coords?: any;
  created_at: string;
};

type DeliveryAssignment = {
  id: string;
  order_id: string;
  status: string;
  order?: Order;
};

interface UseDriverInitializationReturn {
  loading: boolean;
  error: string | null;
  driverProfile: DriverProfile | null;
  availableOrders: Order[];
  activeDelivery: DeliveryAssignment | null;
  refreshOrders: () => Promise<void>;
  refreshActiveDelivery: () => Promise<void>;
}

export function useDriverInitialization(): UseDriverInitializationReturn {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<DeliveryAssignment | null>(null);

  const fetchAvailableOrders = useCallback(async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    try {
      console.log('[Driver] Fetching available orders...');
      console.log('[Driver] Current user:', currentUser.id);
      const orders = await getAvailableOrdersForDrivers();
      console.log('[Driver] Available orders fetched:', orders.length, 'orders');
      console.log('[Driver] Orders:', orders);
      setAvailableOrders(orders as Order[]);
    } catch (err) {
      console.error('[Driver] Failed to fetch available orders:', err);
    }
  }, []);

  const fetchActiveDelivery = useCallback(async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    try {
      console.log('[Driver] Fetching active delivery...');
      const { getDriverActiveAssignments } = await import('@/integrations/supabase/services/delivery.service');
      const assignments = await getDriverActiveAssignments(currentUser.id);
      console.log('[Driver] Active assignments:', assignments.length);
      
      if (assignments.length > 0) {
        const active = assignments[0];
        // Fetch order details
        const { data: orderData } = await supabase
          .from('orders' as any)
          .select('*')
          .eq('id', active.order_id)
          .single();
        setActiveDelivery({ 
          ...active, 
          order: orderData ? orderData as Order : undefined,
          status: (active as any).status || 'assigned'
        } as any);
      } else {
        setActiveDelivery(null);
      }
    } catch (err) {
      console.error('Failed to fetch active delivery:', err);
    }
  }, []);

  useEffect(() => {
    const initializeAndCheck = async () => {
      console.log('[Driver] Initializing driver page...');
      
      // Initialize auth state from session
      await useAuthStore.getState().initializeAuth();
      
      const { user } = useAuthStore.getState();
      console.log('[Driver] User:', user?.id, user?.email);
      
      if (!user) {
        console.log('[Driver] No user found, redirecting to login');
        router.push('/login');
        return;
      }

      // Check if user is a driver
      const checkDriverStatus = async () => {
        try {
          console.log('[Driver] Checking driver status for user:', user.id);
          const { data, error } = await supabase
            .from('drivers' as any)
            .select('*')
            .eq('user_id', user.id)
            .single();

          console.log('[Driver] Driver data:', data, 'Error:', error);

          if (error || !data) {
            console.error('[Driver] Not registered as a driver:', error);
            setError('You are not registered as a driver');
            setLoading(false);
            return;
          }

          setDriverProfile(data as DriverProfile);
          
          // Set driver in global store
          useDriverStore.getState().setDriver(data as any);
          
          setLoading(false);

          // Fetch available orders and active delivery
          console.log('[Driver] Calling fetchAvailableOrders...');
          await fetchAvailableOrders();
          console.log('[Driver] Calling fetchActiveDelivery...');
          await fetchActiveDelivery();
        } catch (err) {
          console.error('[Driver] Failed to verify driver status:', err);
          setError('Failed to verify driver status');
          setLoading(false);
        }
      };

      checkDriverStatus();
    };

    initializeAndCheck();
  }, [router, fetchAvailableOrders, fetchActiveDelivery]);

  return {
    loading,
    error,
    driverProfile,
    availableOrders,
    activeDelivery,
    refreshOrders: fetchAvailableOrders,
    refreshActiveDelivery: fetchActiveDelivery,
  };
}
