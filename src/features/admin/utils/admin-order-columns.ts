/**
 * Admin order column mapping — simple human-readable workflow.
 * Internal DB statuses map to 5 columns; UI never shows technical labels.
 */

export type AdminOrderColumnId =
  | 'incoming'
  | 'preparing'
  | 'ready'
  | 'on_delivery'
  | 'completed';

export type AdminOrderColumn = {
  id: AdminOrderColumnId;
  label: string;
  description: string;
};

export const ADMIN_ORDER_COLUMNS: AdminOrderColumn[] = [
  { id: 'incoming', label: 'Εισερχόμενες', description: 'Νέες παραγγελίες' },
  { id: 'preparing', label: 'Ετοιμάζονται', description: 'Στην κουζίνα' },
  { id: 'ready', label: 'Έτοιμες', description: 'Αναμένουν οδηγό' },
  { id: 'on_delivery', label: 'Σε παράδοση', description: 'Με τον οδηγό' },
  { id: 'completed', label: 'Ολοκληρωμένες', description: 'Παραδόθηκαν' },
];

const ON_DELIVERY_STATUSES = new Set([
  'assigned',
  'picked_up',
  'in_transit',
  'arrived',
]);

const COMPLETED_STATUSES = new Set(['delivered', 'completed', 'cancelled']);

/** Map internal order status to admin column. */
export function getAdminOrderColumn(status: string): AdminOrderColumnId {
  if (COMPLETED_STATUSES.has(status)) return 'completed';
  if (ON_DELIVERY_STATUSES.has(status)) return 'on_delivery';
  if (status === 'ready') return 'ready';
  if (status === 'preparing') return 'preparing';
  if (status === 'pending' || status === 'accepted') return 'incoming';
  return 'incoming';
}

export type AdminNextAction = {
  label: string;
  nextStatus: string;
} | null;

/** Kitchen-side advance actions only — no driver/dispatch controls. */
export function getAdminNextAction(status: string): AdminNextAction {
  switch (status) {
    case 'pending':
      return { label: 'Αποδοχή', nextStatus: 'accepted' };
    case 'accepted':
      return { label: 'Ετοιμάζεται', nextStatus: 'preparing' };
    case 'preparing':
      return { label: 'Έτοιμο', nextStatus: 'ready' };
    default:
      return null;
  }
}

export function groupOrdersByColumn<T extends { status: string }>(
  orders: T[]
): Record<AdminOrderColumnId, T[]> {
  const grouped: Record<AdminOrderColumnId, T[]> = {
    incoming: [],
    preparing: [],
    ready: [],
    on_delivery: [],
    completed: [],
  };

  for (const order of orders) {
    grouped[getAdminOrderColumn(order.status)].push(order);
  }

  return grouped;
}
