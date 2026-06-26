/**
 * Offline queue payload types + legacy optimistic key cleanup.
 * Dispatch UI is server-derived only — no optimistic delivery state is written here.
 */

const OPTIMISTIC_KEY = "driver_optimistic_delivery";

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

/** Clears stale optimistic entries from older builds — does not affect dispatch UI. */
export function clearOptimisticDelivery(driverId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(OPTIMISTIC_KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, OptimisticDelivery>;
    delete all[driverId];
    localStorage.setItem(OPTIMISTIC_KEY, JSON.stringify(all));
  } catch {
    localStorage.removeItem(OPTIMISTIC_KEY);
  }
}
