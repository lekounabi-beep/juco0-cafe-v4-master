// @ts-nocheck - Supabase types don't include new tables yet

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  Home,
  RefreshCw,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  CreditCard,
  Banknote,
  XCircle,
  Edit,
  User,
  Plus,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EspressoBackground } from "@/components/EspressoBackground";
import { formatEur } from "@/lib/cart-store";
import { transitionOrderStatus } from "@/features/delivery/services/workflow.service";
import { toast } from "sonner";
import { useRealtimeOrders } from "@/integrations/supabase/hooks/useRealtimeOrders";
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
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverForm, setDriverForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    vehicle_type: 'car',
  });

  // Load orders from Supabase
  useEffect(() => {
    loadOrders();
  }, []);

  // Use unified realtime service for order updates
  useRealtimeOrders(
    (payload) => {
      console.log("New order received:", payload);
      playNotificationSound();
      loadOrders();
    },
    { event: 'INSERT' }
  );

  // Play notification sound when new order arrives
  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification.mp3");
      audio.play().catch((e) => console.log("Audio play failed:", e));
    } catch (e) {
      console.log("Audio creation failed:", e);
    }
  };

  const loadOrders = async () => {
    try {
      console.log('[Admin] Loading orders...');
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const ordersData = (data as unknown as Order[]) || [];
      console.log('[Admin] Orders loaded:', ordersData.length, 'orders');
      console.log('[Admin] First order status:', ordersData[0]?.status, 'delivery_status:', ordersData[0]?.delivery_status);
      
      // Force re-render by creating new array reference
      setOrders([...ordersData]);

      // Check for new orders and play sound
      if (ordersData.length > lastOrderCount && lastOrderCount > 0) {
        playNotificationSound();
      }
      setLastOrderCount(ordersData.length);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    console.log('[Admin] Button clicked - Order:', orderId, 'New status:', newStatus);
    
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "accepted":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "preparing":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "ready":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "assigned":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "picked_up":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "in_transit":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
      case "arrived":
        return "bg-pink-500/20 text-pink-300 border-pink-500/30";
      case "delivered":
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
      case "completed":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-white/10 text-white/70 border-white/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Εκκρεμεί";
      case "accepted":
        return "Αποδεκτή";
      case "preparing":
        return "Ετοιμάζεται";
      case "ready":
        return "Έτοιμο";
      case "assigned":
        return "Ανατέθηκε";
      case "picked_up":
        return "Παραλήφθηκε";
      case "in_transit":
        return "Σε μεταφορά";
      case "arrived":
        return "Άφιξε";
      case "delivered":
        return "Παραδόθηκε";
      case "completed":
        "Ολοκληρώθηκε";
      case "cancelled":
        return "Ακυρώθηκε";
      default:
        return status;
    }
  };

  const getDeliveryStatusLabel = (deliveryStatus: string) => {
    switch (deliveryStatus) {
      case "pending":
        return "Αναμένεται";
      case "assigned":
        return "Ανατέθηκε";
      case "picked_up":
        return "Παραλήφθηκε";
      case "in_transit":
        return "Σε μεταφορά";
      case "arrived":
        return "Άφιξε";
      case "delivered":
        return "Παραδόθηκε";
      case "cancelled":
        return "Ακυρώθηκε";
      default:
        return deliveryStatus;
    }
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Αποδοχή", action: "accepted", icon: CheckCircle2 };
      case "accepted":
        return { label: "Ετοιμάζεται", action: "preparing", icon: RefreshCw };
      case "preparing":
        return { label: "Έτοιμο", action: "ready", icon: CheckCircle2 };
      case "ready":
        return { label: "Αναμένεται οδηγός", action: null, icon: Clock };
      default:
        return { label: null, action: null, icon: null };
    }
  };

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
          <div className="space-y-4">
            {orders.map((order: Order) => (
              <div
                key={`${order.id}-${order.status}`}
                className="rounded-2xl glass p-6 transition hover:shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-lg font-bold text-white">
                        #{order.order_number}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getStatusColor(order.status)}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                      {order.delivery_status && (
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getStatusColor(order.delivery_status)}`}
                        >
                          {getDeliveryStatusLabel(order.delivery_status)}
                        </span>
                      )}
                      <span className="text-xs text-white/50">
                        {new Date(order.created_at).toLocaleString("el-GR")}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-white">{order.address}</p>
                          {order.address_notes && (
                            <p className="text-xs text-white/60">{order.address_notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="text-sm font-medium text-white hover:text-primary"
                        >
                          {order.customer_phone}
                        </a>
                      </div>
                    </div>

                    {order.driver_id && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="text-sm text-white/80">
                          Οδηγός ανατέθηκε
                        </span>
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-2">
                      {order.payment_method === "card" ? (
                        <CreditCard className="h-4 w-4 text-primary" />
                      ) : (
                        <Banknote className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-sm text-white/80">
                        {order.payment_method === "card" ? "Κάρτα" : "Μετρητά"} —{" "}
                        {order.payment_status === "paid" ? "Πληρώθηκε" : "Εκκρεμεί"}
                      </span>
                      {order.viva_transaction_id && (
                        <span className="text-xs text-white/50">
                          (Viva: {order.viva_transaction_id.slice(0, 8)}...)
                        </span>
                      )}
                    </div>

                    <div className="mt-4 rounded-xl bg-white/5 p-4">
                      <h3 className="text-xs uppercase tracking-wider text-white/60">Προϊόντα</h3>
                      <ul className="mt-2 space-y-1 text-sm">
                        {order.items.map((item: any, idx: number) => (
                          <li key={idx} className="flex justify-between text-white/85">
                            <span>{item.qty}× {item.name}</span>
                            <span>{formatEur(item.qty * item.price)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 border-t border-white/10 pt-3">
                        <div className="flex justify-between text-base font-bold text-white">
                          <span>Σύνολο</span>
                          <span>{formatEur(order.total)}</span>
                        </div>
                      </div>
                      {order.notes && (
                        <p className="mt-2 text-xs text-white/60 italic">
                          Σημειώσεις: {order.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {(() => {
                      const nextAction = getNextAction(order.status);
                      console.log('[Admin] Order:', order.id, 'Status:', order.status, 'Next action:', nextAction);
                      if (!nextAction.label) return null;
                      
                      if (nextAction.action === null) {
                        return (
                          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/80">
                            <Clock className="h-4 w-4 text-primary" />
                            <span>{nextAction.label}</span>
                          </div>
                        );
                      }
                      
                      const Icon = nextAction.icon;
                      return (
                        <button
                          onClick={() => updateOrderStatus(order.id, nextAction.action!)}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:bg-primary/90 transition"
                        >
                          <Icon className="h-4 w-4" />
                          {nextAction.label}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

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
