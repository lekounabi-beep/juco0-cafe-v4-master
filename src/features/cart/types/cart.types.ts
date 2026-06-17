/**
 * Cart feature type definitions
 */

export interface CartItem {
  name: string;
  price: number;
  qty: number;
  image?: string;
  category?: string;
}

export interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, 'qty'>) => void;
  remove: (name: string) => void;
  setQty: (name: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}
