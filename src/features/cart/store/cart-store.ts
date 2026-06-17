/**
 * Cart store using Zustand
 * Moved from src/lib/cart-store.ts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartState } from '../types/cart.types';

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
    { name: 'juco-cart' }
  )
);
