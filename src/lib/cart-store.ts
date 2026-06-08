import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  name: string;
  price: number;
  qty: number;
  image?: string;
  category?: string;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">) => void;
  remove: (name: string) => void;
  setQty: (name: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.name === item.name);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.name === item.name ? { ...i, qty: i.qty + 1 } : i
              ),
            };
          }
          return { items: [...s.items, { ...item, qty: 1 }] };
        }),
      remove: (name) =>
        set((s) => ({ items: s.items.filter((i) => i.name !== name) })),
      setQty: (name, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.name !== name)
              : s.items.map((i) => (i.name === name ? { ...i, qty } : i)),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.qty * i.price, 0),
    }),
    { name: "juco-cart" }
  )
);

export const DELIVERY_FEE = 1.5;
export const FREE_DELIVERY_THRESHOLD = 15;

export function calcDeliveryFee(subtotal: number) {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

export function formatEur(p: number) {
  return `${p.toFixed(2).replace(".", ",")} €`;
}
