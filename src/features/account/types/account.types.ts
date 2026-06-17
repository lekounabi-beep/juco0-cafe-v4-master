/**
 * Account types
 */

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  full_name?: string;
  phone?: string;
}

export interface ProfileCreate {
  user_id: string;
  full_name?: string;
  phone?: string;
  email?: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressCreate {
  user_id: string;
  label: string;
  address: string;
  lat?: number;
  lng?: number;
  notes?: string;
  is_default?: boolean;
}

export interface AddressUpdate {
  label?: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  is_default?: boolean;
}

export interface FavoriteOrder {
  id: string;
  user_id: string;
  items: CartItem[];
  updated_at: string;
}

export interface CartItem {
  name: string;
  price: number;
  qty: number;
  category?: string;
}

export interface Order {
  id: string;
  order_number: string;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  customer_name: string;
  customer_phone: string;
  address: string;
  address_notes: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
  updated_at: string;
}
