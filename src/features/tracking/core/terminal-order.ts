/**
 * Terminal order detection — shared by legacy sync and useTrackingSession.
 */

export type TerminalOrderFields = {
  status?: string | null;
  delivery_status?: string | null;
  payment_status?: string | null;
} | null;

export function isTerminalOrder(order: TerminalOrderFields): boolean {
  if (!order) return false;
  if (order.status === 'cancelled' || order.delivery_status === 'cancelled') return true;
  if (order.payment_status === 'failed') return true;
  return (
    order.status === 'delivered' ||
    order.status === 'completed' ||
    order.delivery_status === 'delivered'
  );
}
