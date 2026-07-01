/**
 * Delivery Actions Component
 * Displays delivery action buttons based on current status.
 * «Έναρξη» (in_transit) is applied automatically after pickup — not shown in UI.
 */

import { Package, CheckCircle2, Loader2 } from 'lucide-react';

interface DeliveryActionsProps {
  status: string;
  onAction: (action: string) => void;
  isPickingUp?: boolean;
  actionLoading?: boolean;
  sticky?: boolean;
}

export function DeliveryActions({
  status,
  onAction,
  isPickingUp = false,
  actionLoading = false,
  sticky = false,
}: DeliveryActionsProps) {
  const actions = [
    {
      key: 'picked_up',
      label: 'Παραλαβή',
      icon: Package,
      allowed: status === 'assigned',
    },
    {
      key: 'delivered',
      label: 'Παράδοση',
      icon: CheckCircle2,
      allowed: status === 'picked_up' || status === 'in_transit' || status === 'arrived',
    },
  ];

  const currentAction = actions.find((a) => a.allowed);

  if (!currentAction) {
    return (
      <div className="text-center py-4">
        <p className="text-white/60">Κατάσταση: {status}</p>
      </div>
    );
  }

  const Icon = currentAction.icon;
  const busy =
    (isPickingUp && currentAction.key === 'picked_up') ||
    (actionLoading && currentAction.key !== 'picked_up');

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onAction(currentAction.key)}
      className={`flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60 ${
        sticky ? 'text-base' : 'h-14'
      }`}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Icon className="h-5 w-5" />
      )}
      {busy ? 'Παρακαλώ περιμένετε...' : currentAction.label}
    </button>
  );
}
