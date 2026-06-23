/**
 * Order Card Component
 * Displays individual order information with accept button
 */

import { MapPin, CheckCircle2, Loader2 } from 'lucide-react';

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

interface OrderCardProps {
  order: Order;
  onAccept: () => void;
  loading: boolean;
}

export function OrderCard({ order, onAccept, loading }: OrderCardProps) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-white">#{order.order_number}</p>
          <p className="text-xs text-white/60">{new Date(order.created_at).toLocaleTimeString('el-GR')}</p>
        </div>
        <p className="font-bold text-white">{order.total.toFixed(2)}€</p>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-white/80 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {order.address}
        </p>
      </div>

      <div className="text-xs text-white/60 mb-3">
        {order.items.map((item, index) => (
          <span key={index}>
            {item.qty}x {item.name}
            {index < order.items.length - 1 && ', '}
          </span>
        ))}
      </div>

      <button
        onClick={onAccept}
        disabled={loading}
        className="w-full h-12 rounded-xl bg-primary flex items-center justify-center gap-2 text-primary-foreground font-semibold shadow-[var(--shadow-glow)] hover:bg-primary/90 transition disabled:opacity-50"
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
