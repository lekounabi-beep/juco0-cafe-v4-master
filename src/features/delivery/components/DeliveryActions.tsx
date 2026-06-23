/**
 * Delivery Actions Component
 * Displays delivery action buttons based on current status
 */

import { Package, Navigation, MapPin, CheckCircle2 } from 'lucide-react';

interface DeliveryActionsProps {
  status: string;
  onAction: (action: string) => void;
}

export function DeliveryActions({ status, onAction }: DeliveryActionsProps) {
  const actions = [
    { key: 'picked_up', label: 'Παραλαβή', icon: Package, allowed: status === 'assigned' },
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
      onClick={() => onAction(currentAction.key)}
      className="w-full h-14 rounded-xl bg-primary flex items-center justify-center gap-2 text-primary-foreground font-semibold shadow-[var(--shadow-glow)] hover:bg-primary/90 transition"
    >
      <Icon className="h-5 w-5" />
      {currentAction.label}
    </button>
  );
}
