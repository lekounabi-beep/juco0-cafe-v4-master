/** Admin dashboard order row — mirrors orders table fields used in UI. */
export type AdminOrder = {
  id: string;
  order_number: string;
  status: string;
  delivery_status: string;
  driver_id: string | null;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  customer_name: string;
  customer_phone: string;
  address: string;
  address_notes?: string | null;
  payment_method: string;
  payment_status: string;
  notes?: string | null;
  created_at: string;
  viva_transaction_id?: string | null;
};

export type AdminOrderListResult =
  { success: true; orders: AdminOrder[] } | { success: false; error: string };
