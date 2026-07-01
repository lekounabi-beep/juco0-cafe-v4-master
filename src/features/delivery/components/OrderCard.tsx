/**
 * Order Card Component
 * Displays individual order information with accept button
 */

import { CheckCircle2, Loader2 } from 'lucide-react';
import type { DriverOrderDetails } from '../types/driver-order.types';
import { formatDriverPaymentMethod } from '../utils/driver-order-display';

interface OrderCardProps {
  order: DriverOrderDetails & { delivery_status?: string };
  onAccept: () => void;
  loading: boolean;
}

export function OrderCard({ order, onAccept, loading }: OrderCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-white">#{order.order_number}</p>
          <p className="text-sm font-semibold text-white">{Number(order.total).toFixed(2)}€</p>
        </div>
        <p className="text-sm leading-relaxed text-white/80">{order.address}</p>
        <p className="text-xs text-white/55">
          {formatDriverPaymentMethod(order.payment_method)}
        </p>
      </div>

      <button
        type="button"
        onClick={onAccept}
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Αποδοχή
          </>
        )}
      </button>
    </div>
  );
}
