/**
 * Reorder hook - handles reordering from order history
 */

import { useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { useRouter } from 'next/navigation';
import type { CartItem } from '@/lib/cart-store';
import type { Order } from '@/features/account/types/account.types';

export function useReorder() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const add = useCart((s) => s.add);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const reorder = async (order: Order) => {
    setLoading(true);

    try {
      // Clear current cart
      clear();

      // Add all items from the order
      order.items.forEach((item) => {
        add({
          name: item.name,
          price: item.price,
          category: item.category,
        });
      });

      // Redirect to checkout
      router.push('/checkout');
    } catch (error) {
      console.error('Reorder error:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    reorder,
    loading,
  };
}
