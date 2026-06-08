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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EspressoBackground } from "@/components/EspressoBackground";
import { formatEur } from "@/lib/cart-store";

type Order = {
  id: string;
  order_number: string;
  status: string;
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

  // Load orders from Supabase
  useEffect(() => {
    loadOrders();
    
    // Set up real-time subscription for new orders
    const channel = supabase
      .channel("orders-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload: any) => {
          console.log("New order received:", payload);
          playNotificationSound();
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const ordersData = (data as unknown as Order[]) || [];
      setOrders(ordersData);

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
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      loadOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "preparing":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "ready":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "delivered":
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
      default:
        return "bg-white/10 text-white/70 border-white/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Εκκρεμεί";
      case "preparing":
        return "Ετοιμάζεται";
      case "ready":
        return "Έτοιμο";
      case "delivered":
        return "Παραδόθηκε";
      default:
        return status;
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
              onClick={loadOrders}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              <RefreshCw className="h-4 w-4" />
              Ανανέωση
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
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
                key={order.id}
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
                    <select
                      value={order.status}
                      onChange={(e: any) => updateOrderStatus(order.id, e.target.value)}
                      className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                    >
                      <option value="pending">Εκκρεμεί</option>
                      <option value="preparing">Ετοιμάζεται</option>
                      <option value="ready">Έτοιμο</option>
                      <option value="delivered">Παραδόθηκε</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
