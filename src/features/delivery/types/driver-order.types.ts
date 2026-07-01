/**
 * Order fields exposed to authenticated drivers for delivery execution.
 */

export type DriverOrderItem = {
  name: string;
  qty: number;
  price?: number;
};

export type DriverOrderDetails = {
  id: string;
  order_number: string;
  status: string;
  delivery_status?: string;
  items: DriverOrderItem[];
  subtotal?: number;
  delivery_fee?: number;
  total: number;
  customer_name: string;
  customer_phone: string;
  address: string;
  address_notes?: string | null;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
  payment_method: string;
  payment_status?: string;
  created_at: string;
  estimated_delivery_eta?: string | null;
  driver_id?: string | null;
};

/** Columns safe to expose via server actions for assigned / acceptable orders. */
export const DRIVER_ORDER_SELECT =
  "id, order_number, status, delivery_status, driver_id, items, subtotal, delivery_fee, total, customer_name, customer_phone, address, address_notes, lat, lng, notes, payment_method, payment_status, created_at, estimated_delivery_eta";
