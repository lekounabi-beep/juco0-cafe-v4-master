"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, CheckCircle2, Clock, MapPin, Phone, RefreshCw, User } from "lucide-react";
import { toast } from "sonner";
import { formatEur } from "@/lib/cart-store";
import { AdminContentContainer } from "@/features/admin/components/AdminContentContainer";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { useAdminOrdersSync } from "@/features/admin/hooks/useAdminOrdersSync";
import type { AdminOrder } from "@/features/admin/types/admin-order.types";
import {
  ADMIN_ORDER_COLUMNS,
  groupOrdersByColumn,
  getAdminNextAction,
  type AdminOrderColumnId,
} from "@/features/admin/utils/admin-order-columns";
import { AdminDriversWorkspace } from "@/features/admin/components/drivers/AdminDriversWorkspace";
import { ADMIN_SECTION, getAdminSectionFromSearch } from "@/features/admin/utils/admin-shell";
import type { OrderStatus } from "@/features/delivery/types/delivery.types";
import { adminTransitionOrderStatus } from "../actions/admin-kitchen-workflow";

function getColumnAccent(columnId: AdminOrderColumnId) {
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
}

function OrdersWorkspace() {
  const { orders, loading, refresh: loadOrders } = useAdminOrdersSync();

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const result = await adminTransitionOrderStatus(orderId, newStatus as OrderStatus);

      if (!result.success) {
        console.error("Error updating order status:", result.error);
        toast.error(result.error || "Failed to update order status");
        return;
      }

      await loadOrders();
      toast.success("Order status updated successfully");
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update order status");
    }
  };

  const ordersByColumn = groupOrdersByColumn(orders);

  return (
    <>
      <AdminContentContainer className="py-8">
        <AdminPageHeader
          title="Orders"
          description={
            <>
              <p>{loading ? "Φόρτωση..." : `${orders.length} παραγγελίες`}</p>
              <p className="mt-1">
                Διαχειρίσου τη ροή κουζίνας και παρακολούθησε live τις ενεργές παραγγελίες.
              </p>
            </>
          }
          actions={
            <>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="text-sm text-white/80">Real-time updates</span>
              </div>
              <button
                onClick={() => void loadOrders()}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <RefreshCw className="h-4 w-4" />
                Ανανέωση
              </button>
            </>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-white/60">Φόρτωση παραγγελιών...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
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

                <div className="space-y-3 pr-1 xl:max-h-[70vh] xl:overflow-y-auto">
                  {ordersByColumn[column.id].length === 0 ? (
                    <p className="rounded-xl bg-black/20 px-3 py-6 text-center text-xs text-white/40">
                      Καμία παραγγελία
                    </p>
                  ) : (
                    ordersByColumn[column.id].map((order: AdminOrder) => {
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
                              <span className="line-clamp-2 text-white/80">{order.address}</span>
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
                            {order.items.slice(0, 3).map((item, idx: number) => (
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
                              onClick={() =>
                                void updateOrderStatus(order.id, nextAction.nextStatus)
                              }
                              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-primary/90"
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
      </AdminContentContainer>
    </>
  );
}

function AdminDashboard() {
  const searchParams = useSearchParams();
  const section = getAdminSectionFromSearch("/admin", searchParams.get("section"));

  const workspace = useMemo(() => {
    if (section === ADMIN_SECTION.DRIVERS) {
      return <AdminDriversWorkspace />;
    }
    return <OrdersWorkspace />;
  }, [section]);

  return workspace;
}

export default AdminDashboard;
