/**
 * Cart hook - wrapper for cart store
 */

import { useCart as useCartStore } from '../store/cart-store';
import type { CartItem } from '../types/cart.types';

export function useCart() {
  const items = useCartStore((s) => s.items);
  const add = useCartStore((s) => s.add);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const count = useCartStore((s) => s.count());
  const subtotal = useCartStore((s) => s.subtotal());

  return {
    items,
    add,
    setQty,
    remove,
    clear,
    count,
    subtotal,
  };
}

export function useCartItem(name: string) {
  const item = useCartStore((s) => s.items.find((i) => i.name === name));
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);

  return {
    item,
    setQty: (qty: number) => setQty(name, qty),
    remove: () => remove(name),
  };
}
