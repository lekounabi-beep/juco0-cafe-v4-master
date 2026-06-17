/**
 * Cart Step component - Step 1 of checkout
 */

import { useCart } from '@/lib/cart-store';
import { CartItemComponent } from '@/features/cart/components/CartItem';
import { CartSummary } from '@/features/cart/components/CartSummary';
import { calcDeliveryFee } from '@/shared/utils/currency';

export function CartStep() {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const deliveryFee = calcDeliveryFee(subtotal);
  const total = subtotal + deliveryFee;

  return (
    <section className="space-y-4 animate-fade-up">
      <h2 className="text-xl font-semibold text-white">Το καλάθι σου</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <CartItemComponent key={item.name} name={item.name} />
        ))}
      </ul>

      <CartSummary subtotal={subtotal} deliveryFee={deliveryFee} total={total} />
    </section>
  );
}
