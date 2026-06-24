/**
 * Customer Tracking Page
 * Live delivery tracking experience similar to Wolt/Uber Eats
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EspressoBackground } from '@/components/EspressoBackground';
import { useRealtimeOrder } from '@/integrations/supabase/hooks/useRealtimeOrders';
import { useRealtimeDeliveryAssignment } from '@/integrations/supabase/hooks/useRealtimeDeliveries';
import { useRealtimeDriver } from '@/integrations/supabase/hooks/useRealtimeDrivers';
import { useETA } from '@/features/delivery/hooks/useETA';
import { formatETA, formatDistance } from '@/features/delivery/services/eta.service';
import { supabase } from '@/integrations/supabase/client';
import { CustomerDeliveryTimeline } from '@/features/tracking/components/CustomerDeliveryTimeline';
import type { Coordinates } from '@/shared/types/common.types';
import { orderCoordinates } from '@/shared/utils/order-fields';
import {
  resolveTrackingDeliveryStatus,
  getCustomerOrderStep,
} from '@/shared/utils/customer-status';
import { speedFromKmh } from '@/features/delivery/services/speed.service';
import { useCustomerMapSnapshot } from '@/features/delivery/hooks/useCustomerMapSnapshot';
import { playNotificationSound } from '@/features/notifications/services/notification-sound.service';
import { MapPin, Package, AlertCircle } from 'lucide-react';

const FALLBACK_ETA_SPEED_MS = speedFromKmh(25);

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
  lat?: number | null;
  lng?: number | null;
  coords?: Coordinates;
};

type Driver = {
  id: string;
  full_name: string;
  vehicle_type: string;
  phone: string;
  availability_status: string;
};

type DeliveryAssignment = {
  id: string;
  order_id: string;
  driver_id: string;
  assigned_at: string;
  accepted_at?: string | null;
  picked_up_at?: string | null;
  started_delivery_at?: string | null;
  arrived_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
};

export default function TrackOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [delivery, setDelivery] = useState<DeliveryAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useRealtimeOrder(orderId, (payload) => {
    if (payload.eventType === 'UPDATE') {
      setOrder(payload.new as Order);
    }
  });

  useRealtimeDeliveryAssignment(delivery?.id || '', (payload) => {
    if (payload.eventType === 'UPDATE') {
      const prev = delivery;
      const next = payload.new as DeliveryAssignment;
      setDelivery(next);

      const milestoneReached =
        (!prev?.picked_up_at && next.picked_up_at) ||
        (!prev?.started_delivery_at && next.started_delivery_at) ||
        (!prev?.arrived_at && next.arrived_at) ||
        (!prev?.delivered_at && next.delivered_at);

      if (milestoneReached) {
        void playNotificationSound('delivery', {
          eventId: `${next.id}-${next.picked_up_at ?? ''}-${next.started_delivery_at ?? ''}-${next.arrived_at ?? ''}-${next.delivered_at ?? ''}`,
          orderId: orderId,
        });
      }
    }
  });

  useRealtimeDriver(order?.driver_id || '', (payload) => {
    if (payload.eventType === 'UPDATE') {
      setDriver(payload.new as Driver);
    }
  });

  useEffect(() => {
    if (!order?.driver_id) return;

    const fetchDelivery = async () => {
      const { data, error: fetchError } = await (supabase.rpc as any)(
        'get_delivery_assignment_for_order',
        { p_order_id: orderId }
      );

      if (fetchError || !data) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setDelivery(row as DeliveryAssignment);
    };

    fetchDelivery();
  }, [order?.driver_id, orderId]);

  useEffect(() => {
    const driverId = order?.driver_id;
    if (!driverId) return;

    const fetchDriver = async () => {
      const { data, error: fetchError } = await supabase
        .from('drivers' as any)
        .select('*')
        .eq('id', driverId)
        .single();

      if (fetchError || !data) return;
      setDriver(data as Driver);
    };

    fetchDriver();
  }, [order?.driver_id]);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data, error: fetchError } = await (supabase.rpc as any)('get_order_for_tracking', {
          order_uuid: orderId,
        });

        if (fetchError) {
          setError('Order not found');
          setLoading(false);
          return;
        }

        const row = Array.isArray(data) ? data[0] : data;
        if (!row) {
          setError('Order not found');
          setLoading(false);
          return;
        }

        setOrder(row as Order);
        setLoading(false);
      } catch {
        setError('Failed to load order');
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const deliveryStatus = useMemo(
    () => resolveTrackingDeliveryStatus(order, delivery),
    [order, delivery]
  );

  const customerStep = useMemo(
    () => getCustomerOrderStep(order?.status, deliveryStatus),
    [order?.status, deliveryStatus]
  );

  const destination = useMemo(() => orderCoordinates(order), [order]);

  const { snapshotInput: customerSnapshotInput, debug: customerMapDebug } = useCustomerMapSnapshot(
    delivery?.id,
    destination,
    deliveryStatus
  );

  const driverLocation = useMemo(
    () =>
      customerSnapshotInput.driverLat != null
        ? {
            lat: customerSnapshotInput.driverLat,
            lng: customerSnapshotInput.driverLng!,
            heading: customerSnapshotInput.driverHeading ?? 0,
          }
        : null,
    [
      customerSnapshotInput.driverLat,
      customerSnapshotInput.driverLng,
      customerSnapshotInput.driverHeading,
    ]
  );

  const showDriverOnMap = customerStep === 'on_the_way';

  const etaResult = useETA({
    currentLocation:
      showDriverOnMap && driverLocation
        ? { lat: driverLocation.lat, lng: driverLocation.lng }
        : null,
    destination,
    averageSpeedMs:
      showDriverOnMap && driverLocation ? FALLBACK_ETA_SPEED_MS : 0,
  });

  const showError = !loading && (error || !order);
  const showContent = !loading && order && !error;

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />

      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-white/80">Φόρτωση παραγγελίας...</p>
          </div>
        </div>
      )}

      {showError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="max-w-md text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-400" />
            <h1 className="mb-2 text-2xl font-bold text-white">Παραγγελία δεν βρέθηκε</h1>
            <p className="mb-6 text-white/70">
              {error || 'Η παραγγελία δεν υπάρχει ή έχει διαγραφεί.'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-primary/90"
            >
              Επιστροφή στην αρχική
            </button>
          </div>
        </div>
      )}

      {showContent && (
        <div className="relative z-10 min-h-screen pb-20">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
                  J
                </span>
                <span className="font-display text-lg font-semibold text-white">
                  Παρακολούθηση Παραγγελίας
                </span>
              </div>
              <span className="font-display text-lg font-bold text-white">
                #{order.order_number}
              </span>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-6">
            <CustomerDeliveryTimeline
              orderStatus={order.status}
              deliveryStatus={deliveryStatus}
              driverName={driver?.full_name}
              eta={
                showDriverOnMap && etaResult.etaResult?.eta
                  ? formatETA(etaResult.etaResult.eta)
                  : null
              }
              distance={
                showDriverOnMap && etaResult.etaResult
                  ? formatDistance(etaResult.etaResult.remainingDistance)
                  : null
              }
              snapshotInput={customerSnapshotInput}
              mapDebug={customerMapDebug}
            />
          </div>

          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
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
                <div className="mt-3 border-t border-white/10 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">Υποσύνολο</span>
                    <span className="text-white/60">{order.subtotal.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">Κόστος παράδοσης</span>
                    <span className="text-white/60">{order.delivery_fee.toFixed(2)}€</span>
                  </div>
                  <div className="mt-2 flex justify-between text-base font-semibold text-white">
                    <span>Σύνολο</span>
                    <span>{order.total.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
                <MapPin className="h-5 w-5 text-primary" />
                Διεύθυνση Παράδοσης
              </h3>
              <p className="text-white/80">{order.address}</p>
              {order.address_notes && (
                <p className="mt-2 text-sm text-white/60">{order.address_notes}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
