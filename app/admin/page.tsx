// @ts-nocheck - Supabase types don't include new tables yet

"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Bell,
  Home,
  RefreshCw,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Edit,
  User,
  Plus,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EspressoBackground } from "@/components/EspressoBackground";
import { formatEur } from "@/lib/cart-store";
import { transitionOrderStatus } from "@/features/delivery/services/workflow.service";
import {
  ADMIN_ORDER_COLUMNS,
  groupOrdersByColumn,
  getAdminNextAction,
  type AdminOrderColumnId,
} from "@/features/admin/utils/admin-order-columns";
import { toast } from "sonner";
import { useRealtimeOrders } from "@/integrations/supabase/hooks/useRealtimeOrders";
import { playNotificationSound } from "@/features/notifications/services/notification-sound.service";
import { realtimeNotificationKeys } from "@/features/notifications/utils/realtime-notification-keys";
import { NotificationSettingsSection } from "@/features/notifications/components/NotificationSettingsSection";
import { createDriver } from "../actions/create-driver";

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
  customer_name: string;
  customer_phone: string;
  address: string;
  address_notes?: string;
  payment_method: string;
  payment_status: string;
  notes?: string;
  created_at: string;
  viva_transaction_id?: string;
};

function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverForm, setDriverForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    vehicle_type: 'car',
  });
  const loadOrdersTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setOrders((data as unknown as Order[]) || []);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleLoadOrders = useCallback(() => {
    if (loadOrdersTimerRef.current) {
      clearTimeout(loadOrdersTimerRef.current);
    }
    loadOrdersTimerRef.current = setTimeout(() => {
      loadOrders();
    }, 300);
  }, [loadOrders]);

  // Load orders from Supabase
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Realtime: refresh list on any order change; sound only on new orders
  useRealtimeOrders((payload) => {
    if (payload.eventType === 'INSERT') {
      void playNotificationSound('order', realtimeNotificationKeys(payload));
    }
    scheduleLoadOrders();
  });

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // Use workflow service for all status transitions
      const result = await transitionOrderStatus(orderId, newStatus as any);
      
      if (!result.success) {
        console.error("Error updating order status:", result.error);
        toast.error(result.error || "Failed to update order status");
        return;
      }
      
      loadOrders();
      toast.success("Order status updated successfully");
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update order status");
    }
  };

  const getColumnAccent = (columnId: AdminOrderColumnId) => {
    switch (columnId) {
      case "incoming":
        return "border-yellow-500/30 bg-yellow-500/5";
      case "preparing":
        return "border-blue-500/30 bg-blue-500/5";
      case "ready":
        return "border-green-500/30 bg-green-500/5";
      case "on_delivery":
        return "border-orange-500/30 bg-orange-500/5";
      case "completed":
        return "border-white/20 bg-white/5";
      default:
        return "border-white/20 bg-white/5";
    }
  };

  const ordersByColumn = groupOrdersByColumn(orders);

  const handleCreateDriver = async () => {
    try {
      const result = await createDriver(driverForm);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      toast.success('Driver δημιουργήθηκε επιτυχώς!');
      setShowDriverModal(false);
      setDriverForm({ email: '', full_name: '', phone: '', vehicle_type: 'car' });
    } catch (error) {
      console.error('Error creating driver:', error);
      toast.error('Αποτυχία δημιουργίας driver.');
    }
  };

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />
      
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">J</span>
            <span className="font-display text-lg font-semibold text-white">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDriverModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              <Plus className="h-4 w-4" />
              + Driver
            </button>
            <Link
              href="/admin/menu"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              <Edit className="h-4 w-4" />
              Edit Menu
            </Link>
            <button
              onClick={loadOrders}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              <RefreshCw className="h-4 w-4" />
              Ανανέωση
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              <Home className="h-4 w-4" />
              Αρχική
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Παραγγελίες</h1>
            <p className="mt-1 text-white/60">
              {loading ? "Φόρτωση..." : `${orders.length} παραγγελίες`}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm text-white/80">Real-time updates</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-white/60">Φόρτωση παραγγελιών...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl glass p-12 text-center">
            <Clock className="mx-auto h-16 w-16 text-white/30" />
            <h2 className="mt-4 text-xl font-semibold text-white">Δεν υπάρχουν παραγγελίες</h2>
            <p className="mt-2 text-white/60">Οι νέες παραγγελίες θα εμφανιστούν εδώ.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {ADMIN_ORDER_COLUMNS.map((column) => (
              <div
                key={column.id}
                className={`rounded-2xl border p-4 backdrop-blur-sm ${getColumnAccent(column.id)}`}
              >
                <div className="mb-4">
                  <h2 className="font-semibold text-white">{column.label}</h2>
                  <p className="text-xs text-white/50">{column.description}</p>
                  <p className="mt-1 text-sm text-white/70">
                    {ordersByColumn[column.id].length} παραγγελίες
                  </p>
                </div>

                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  {ordersByColumn[column.id].length === 0 ? (
                    <p className="rounded-xl bg-black/20 px-3 py-6 text-center text-xs text-white/40">
                      Καμία παραγγελία
                    </p>
                  ) : (
                    ordersByColumn[column.id].map((order: Order) => {
                      const nextAction = getAdminNextAction(order.status);
                      return (
                        <div
                          key={order.id}
                          className={`rounded-xl border border-white/10 bg-black/30 p-4 ${
                            order.status === "cancelled" ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-display font-bold text-white">
                                #{order.order_number}
                              </p>
                              <p className="text-xs text-white/50">
                                {new Date(order.created_at).toLocaleString("el-GR")}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-primary">
                              {formatEur(order.total)}
                            </p>
                          </div>

                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                              <span className="text-white/80 line-clamp-2">{order.address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-primary" />
                              <a
                                href={`tel:${order.customer_phone}`}
                                className="text-white/80 hover:text-primary"
                              >
                                {order.customer_phone}
                              </a>
                            </div>
                          </div>

                          <ul className="mt-3 space-y-0.5 text-xs text-white/70">
                            {order.items.slice(0, 3).map((item: any, idx: number) => (
                              <li key={idx}>
                                {item.qty}× {item.name}
                              </li>
                            ))}
                            {order.items.length > 3 && (
                              <li className="text-white/40">+{order.items.length - 3} ακόμα</li>
                            )}
                          </ul>

                          {order.driver_id && column.id === "on_delivery" && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-white/60">
                              <User className="h-3.5 w-3.5 text-primary" />
                              <span>Με οδηγό</span>
                            </div>
                          )}

                          {nextAction && (
                            <button
                              onClick={() => updateOrderStatus(order.id, nextAction.nextStatus)}
                              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:bg-primary/90 transition"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {nextAction.label}
                            </button>
                          )}

                          {column.id === "ready" && (
                            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">
                              <Clock className="h-3.5 w-3.5" />
                              <span>Αναμένει οδηγό</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-8">
        <NotificationSettingsSection compact />
      </div>

      {/* Driver Creation Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-black/90 border border-white/10 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Δημιουργία Driver</h2>
              <button
                onClick={() => setShowDriverModal(false)}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Email *
                </label>
                <input
                  type="email"
                  value={driverForm.email}
                  onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white placeholder-white/50 focus:border-primary focus:outline-none"
                  placeholder="driver@example.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Όνομα *
                </label>
                <input
                  type="text"
                  value={driverForm.full_name}
                  onChange={(e) => setDriverForm({ ...driverForm, full_name: e.target.value })}
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white placeholder-white/50 focus:border-primary focus:outline-none"
                  placeholder="Όνομα Driver"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Τηλέφωνο *
                </label>
                <input
                  type="tel"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white placeholder-white/50 focus:border-primary focus:outline-none"
                  placeholder="+30 6900000000"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Τύπος Οχήματος
                </label>
                <select
                  value={driverForm.vehicle_type}
                  onChange={(e) => setDriverForm({ ...driverForm, vehicle_type: e.target.value })}
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white focus:border-primary focus:outline-none"
                >
                  <option value="car">Αυτοκίνητο</option>
                  <option value="motorcycle">Μοτοσικλέτα</option>
                  <option value="bicycle">Ποδήλατο</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDriverModal(false)}
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/20 transition"
                >
                  Ακύρωση
                </button>
                <button
                  onClick={handleCreateDriver}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-white font-semibold shadow-[var(--shadow-glow)] hover:bg-primary/90 transition"
                >
                  Δημιουργία
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
