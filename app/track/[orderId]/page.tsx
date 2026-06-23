/**
 * Customer Tracking Page
 * Live delivery tracking experience similar to Wolt/Uber Eats
 */

'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EspressoBackground } from '@/components/EspressoBackground';
import { useRealtimeOrder } from '@/integrations/supabase/hooks/useRealtimeOrders';
import { useRealtimeDeliveryAssignment } from '@/integrations/supabase/hooks/useRealtimeDeliveries';
import { useRealtimeDriver } from '@/integrations/supabase/hooks/useRealtimeDrivers';
import { useETA } from '@/features/delivery/hooks/useETA';
import { formatETA, formatDistance } from '@/features/delivery/services/eta.service';
import { ORDER_STATUS, DELIVERY_STATUS } from '@/features/delivery/types/delivery.types';
import { supabase } from '@/integrations/supabase/client';
import { TrackingMap } from '@/features/maps/components/TrackingMap';
import { DeliveryProgressCircle } from '@/features/delivery/components/DeliveryProgressCircle';
import { DeliveryStatusText } from '@/features/delivery/components/DeliveryStatusText';
import type { Coordinates } from '@/shared/types/common.types';
import { MapPin, Navigation, Clock, Package, CheckCircle2, AlertCircle, Phone, MessageCircle } from 'lucide-react';

type Order = {
  id: string;
  order_number: string;
  status: string;
  delivery_status: string;
  driver_id: string | null;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  address: string;
  address_notes?: string;
  customer_phone: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  coords?: Coordinates;
};

type Driver = {
  id: string;
  name: string;
  vehicle_type: string;
  phone: string;
  availability: string;
};

type DeliveryAssignment = {
  id: string;
  order_id: string;
  driver_id: string;
  status: string;
  assigned_at: string;
  picked_up_at?: string;
  started_delivery_at?: string;
  arrived_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
};

type DriverLocation = {
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: string;
};

export default function TrackOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  console.log('[TRACKING PAGE] Render called with orderId:', orderId);

  const [order, setOrder] = useState<Order | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [delivery, setDelivery] = useState<DeliveryAssignment | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);

  console.log('[TRACKING PAGE] State:', { order, driver, delivery, driverLocation, loading, error });

  // Subscribe to order updates
  useRealtimeOrder(orderId, (payload) => {
    console.log('[TRACKING PAGE] Order realtime update received:', payload);
    if (payload.eventType === 'UPDATE') {
      console.log('[TRACKING PAGE] Updating order state with:', payload.new);
      setOrder(payload.new as Order);
    }
  });

  // Subscribe to delivery assignment updates (moved to top level)
  useRealtimeDeliveryAssignment(delivery?.id || '', (payload) => {
    if (payload.eventType === 'UPDATE') {
      setDelivery(payload.new as DeliveryAssignment);
    }
  });

  // Subscribe to driver updates (moved to top level)
  useRealtimeDriver(order?.driver_id || '', (payload) => {
    if (payload.eventType === 'UPDATE') {
      setDriver(payload.new as Driver);
    }
  });

  // Fetch delivery assignment
  useEffect(() => {
    console.log('[TRACKING PAGE] Fetch delivery assignment effect triggered');
    console.log('[TRACKING PAGE] order?.driver_id:', order?.driver_id);
    console.log('[TRACKING PAGE] orderId:', orderId);

    if (!order?.driver_id) {
      console.log('[TRACKING PAGE] Skipping delivery fetch - no driver_id');
      return;
    }

    const fetchDelivery = async () => {
      console.log('[TRACKING PAGE] Fetching delivery assignment for order:', orderId);
      const { data, error } = await supabase
        .from('delivery_assignments' as any)
        .select('*')
        .eq('order_id', orderId)
        .single();

      console.log('[TRACKING PAGE] Delivery fetch result - data:', data, 'error:', error);

      if (error) {
        console.error(
          '[TRACKING PAGE] Error fetching delivery:',
          {
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code,
            error
          }
        );
        return;
      }

      console.log('[TRACKING PAGE] Setting delivery state:', data);
      setDelivery(data as DeliveryAssignment);
    };

    fetchDelivery();
  }, [order?.driver_id, orderId]);

  // Fetch driver
  useEffect(() => {
    const driverId = order?.driver_id;
    if (!driverId) return;

    const fetchDriver = async () => {
      const { data, error } = await supabase
        .from('drivers' as any)
        .select('*')
        .eq('id', driverId)
        .single();

      if (error) {
        console.error(
          'Error fetching driver:',
          {
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code,
            error
          }
        );
        return;
      }

      setDriver(data as Driver);
    };

    fetchDriver();
  }, [order?.driver_id]);

  // Subscribe to driver location updates
  useEffect(() => {
    if (!delivery?.id) return;

    const fetchDriverLocation = async () => {
      const { data, error } = await supabase
        .from('delivery_locations' as any)
        .select('*')
        .eq('delivery_assignment_id', delivery.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          'Error fetching driver location:',
          {
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code,
            error
          }
        );
        return;
      }

      if (data) {
        setDriverLocation(data as DriverLocation);
      }
    };

    fetchDriverLocation();

    // Subscribe to location updates
    const channel = supabase
      .channel(`location-${delivery.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_locations',
          filter: `assignment_id=eq.${delivery.id}`,
        },
        (payload) => {
          setDriverLocation(payload.new as DriverLocation);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [delivery?.id]);

  // Fetch initial order
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders' as any)
          .select('*')
          .eq('id', orderId)
          .single();

        if (error) {
          setError('Order not found');
          setLoading(false);
          return;
        }

        setOrder(data as Order);
        setLoading(false);
      } catch (err) {
        setError('Failed to load order');
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Calculate ETA
  const etaResult = useETA({
    currentLocation: driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : null,
    destination: order?.coords || null,
    averageSpeedMs: driverLocation?.speed || 0,
  });

  console.log('[TRACKING PAGE] Rendering tracking page with data');

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-white/80">Φόρτωση παραγγελίας...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {(error || !order) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Παραγγελία δεν βρέθηκε</h1>
            <p className="text-white/70 mb-6">{error || 'Η παραγγελία δεν υπάρχει ή έχει διαγραφεί.'}</p>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:bg-primary/90 transition"
            >
              Επιστροφή στην αρχική
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 min-h-screen pb-20">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">J</span>
              <span className="font-display text-lg font-semibold text-white">Παρακολούθηση Παραγγελίας</span>
            </div>
            <span className="font-display text-lg font-bold text-white">#{order?.order_number || ''}</span>
          </div>
        </header>

        {/* Circular Progress */}
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="rounded-2xl bg-black/40 border border-white/10 p-6 backdrop-blur-sm">
            <DeliveryProgressCircle
              orderStatus={order?.status}
              deliveryStatus={delivery?.status}
              eta={etaResult.etaResult?.eta ? etaResult.etaResult.eta.getTime() / 1000 : null}
            />
          </div>
        </div>

        {/* Map Section - ALWAYS MOUNTED */}
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="relative h-[400px] rounded-2xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm">
            <TrackingMap
              driverPosition={driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : null}
              driverHeading={driverLocation?.heading || 0}
              destination={order?.coords || null}
              storeLocation={{ lat: 38.3930, lng: 21.8280 }}
              deliveryStatus={delivery?.status || 'pending'}
              deliveryStarted={!!delivery?.picked_up_at}
            />
          </div>
        </div>

        {/* Driver Card */}
        {driver && order && (
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Navigation className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{driver.name}</h3>
                  <p className="text-sm text-white/60">{driver.vehicle_type}</p>
                </div>
                {etaResult.etaResult && (
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {formatETA(etaResult.etaResult.eta)}
                    </p>
                    <p className="text-xs text-white/60">
                      {formatDistance(etaResult.etaResult.remainingDistance)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* Order Details */}
        {order && (
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Λεπτομέρειες Παραγγελίας
              </h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-white/80">
                      {item.qty}x {item.name}
                    </span>
                    <span className="text-white/60">{(item.price * item.qty).toFixed(2)}€</span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-3 mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">Υποσύνολο</span>
                    <span className="text-white/60">{order.subtotal.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">Κόστος παράδοσης</span>
                    <span className="text-white/60">{order.delivery_fee.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-white mt-2">
                    <span>Σύνολο</span>
                    <span>{order.total.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Address */}
        {order && (
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Διεύθυνση Παράδοσης
              </h3>
              <p className="text-white/80">{order.address}</p>
              {order.address_notes && (
                <p className="text-sm text-white/60 mt-2">{order.address_notes}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

