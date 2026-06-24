/**
 * Optimistic driver delivery state persisted locally for offline mode.
 */

const OPTIMISTIC_KEY = 'driver_optimistic_delivery';

export type OptimisticOrder = {
  id: string;
  order_number: string;
  status: string;
  items: { name: string; qty: number }[];
  total: number;
  address: string;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
};

export type OptimisticDelivery = {
  id: string;
  order_id: string;
  driver_id: string;
  status: string;
  assigned_at?: string;
  accepted_at?: string | null;
  picked_up_at?: string | null;
  started_delivery_at?: string | null;
  arrived_at?: string | null;
  delivered_at?: string | null;
  order?: OptimisticOrder;
};

function readAll(): Record<string, OptimisticDelivery> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OPTIMISTIC_KEY);
    return raw ? (JSON.parse(raw) as Record<string, OptimisticDelivery>) : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, OptimisticDelivery>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OPTIMISTIC_KEY, JSON.stringify(data));
}

export function getOptimisticDelivery(driverId: string): OptimisticDelivery | null {
  const all = readAll();
  const entry = all[driverId];
  if (!entry || entry.delivered_at) return null;
  return entry;
}

export function setOptimisticDelivery(driverId: string, delivery: OptimisticDelivery) {
  const all = readAll();
  all[driverId] = delivery;
  writeAll(all);
}

export function updateOptimisticDeliveryStatus(
  driverId: string,
  status: string,
  timestampField?: keyof OptimisticDelivery
) {
  const current = getOptimisticDelivery(driverId);
  if (!current) return;
  const now = new Date().toISOString();
  const updated: OptimisticDelivery = {
    ...current,
    status,
    ...(timestampField ? { [timestampField]: now } : {}),
    order: current.order
      ? { ...current.order, status: status === 'delivered' ? 'delivered' : current.order.status }
      : undefined,
  };
  setOptimisticDelivery(driverId, updated);
}

export function clearOptimisticDelivery(driverId: string) {
  const all = readAll();
  delete all[driverId];
  writeAll(all);
}
