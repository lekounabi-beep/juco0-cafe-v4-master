/**
 * Orders Section component
 */

"use client";

import { useOrders } from "../hooks/useOrders";
import { OrderCard } from "./OrderCard";
import { Loader2, ShoppingBag } from "lucide-react";

export function OrdersSection() {
  const { orders, loading, error } = useOrders();

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Ιστορικό Παραγγελιών</h2>
        <p className="text-sm text-white/60">Δείτε τις προηγούμενες παραγγελίες σας</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {orders.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-12 text-center">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <p className="text-white/40">Δεν έχετε παραγγελίες ακόμα</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
