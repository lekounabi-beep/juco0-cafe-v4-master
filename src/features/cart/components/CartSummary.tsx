/**
 * Cart Summary component
 */

import { formatEur } from '@/shared/utils/currency';
import { FREE_DELIVERY_THRESHOLD } from '@/config/constants';

interface CartSummaryProps {
  subtotal: number;
  deliveryFee: number;
  total: number;
  compact?: boolean;
}

export function CartSummary({ subtotal, deliveryFee, total, compact = false }: CartSummaryProps) {
  const remainingForFree = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);

  return (
    <div className={`rounded-2xl ${compact ? '' : 'glass p-4'} space-y-1.5 text-sm`}>
      <SummaryRow label="Μερικό σύνολο" value={formatEur(subtotal)} />
      <SummaryRow
        label="Μεταφορικά"
        value={deliveryFee === 0 ? "Δωρεάν" : formatEur(deliveryFee)}
        accent={deliveryFee === 0}
      />
      {!compact && remainingForFree > 0 && (
        <p className="pt-1 text-xs text-white/55">
          Πρόσθετε άλλα {formatEur(remainingForFree)} για δωρεάν παράδοση.
        </p>
      )}
      <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
        <span className="text-sm font-semibold text-white">Σύνολο</span>
        <span className="text-lg font-bold text-white">{formatEur(total)}</span>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const className = accent ? "font-semibold text-primary" : "text-white";
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/70">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}
