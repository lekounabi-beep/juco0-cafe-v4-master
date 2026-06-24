/**
 * Delivery Actions Component
 * Displays delivery action buttons based on current status
 */

import { Package, Navigation, MapPin, CheckCircle2, Loader2 } from 'lucide-react';

interface DeliveryActionsProps {
  status: string;
  onAction: (action: string) => void;
  isPickingUp?: boolean;
}

export function DeliveryActions({ status, onAction, isPickingUp = false }: DeliveryActionsProps) {
  const actions = [
    {
      key: 'picked_up',
      label: 'Παραλαβή',
      icon: Package,
      allowed: status === 'assigned',
    },
    { key: 'start_delivery', label: 'Έναρξη', icon: Navigation, allowed: status === 'picked_up' },
    { key: 'arrived', label: 'Άφιξη', icon: MapPin, allowed: status === 'in_transit' },
    { key: 'delivered', label: 'Παράδοση', icon: CheckCircle2, allowed: status === 'arrived' },
  ];

  const currentAction = actions.find(a => a.allowed);

  if (!currentAction) {
    return (
      <div className="text-center py-4">
        <p className="text-white/60">Κατάσταση: {status}</p>
      </div>
    );
  }

  const Icon = currentAction.icon;

  return (
    <button
      type="button"
      disabled={isPickingUp}
      onClick={() => onAction(currentAction.key)}
      className="w-full h-14 rounded-xl bg-primary flex items-center justify-center gap-2 text-primary-foreground font-semibold shadow-[var(--shadow-glow)] hover:bg-primary/90 transition disabled:opacity-60 disabled:pointer-events-none"
    >
      {isPickingUp ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Icon className="h-5 w-5" />
      )}
      {isPickingUp ? 'Αναμονή GPS...' : currentAction.label}
    </button>
  );
}
