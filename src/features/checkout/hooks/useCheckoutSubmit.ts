/**
 * Checkout Submit hook - handles order submission
 */

import { useCallback } from 'react';
import { useCheckoutStore } from '../store/checkout-store';
import { useCart } from '@/lib/cart-store';
import { createOrder, type OrderResult } from '@/integrations/supabase/services/order.service';
import { createVivaOrderCode, redirectToVivaPayment } from '@/integrations/viva/services/payment.service';
import { calcDeliveryFee } from '@/shared/utils/currency';
import type { CheckoutSubmitState } from '../types/checkout.types';

export function useCheckoutSubmit() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const {
    name,
    phone,
    address,
    addressNotes,
    notes,
    coords,
    payment,
    userId,
    setSubmitting,
    setError,
  } = useCheckoutStore();

  const submitOrder = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    try {
      const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
      const deliveryFee = payment === 'pickup' ? 0 : calcDeliveryFee(subtotal);
      const total = subtotal + deliveryFee;

      // Card payment flow
      if (payment === 'card') {
        const vivaResponse = await Promise.race([
          createVivaOrderCode(total, {
            email: undefined,
            fullName: name.trim(),
            phone: phone.trim(),
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Viva Wallet API timeout')), 15000)
          )
        ]) as any;

        console.log('Viva Wallet response:', vivaResponse);

        if (!vivaResponse.orderCode) {
          throw new Error(vivaResponse.errorText || 'Failed to create Viva Wallet order');
        }

        // Store order data in sessionStorage
        const orderPayload = {
          items: items.map((i) => ({ name: i.name, price: i.price, qty: i.qty, category: i.category })),
          subtotal,
          delivery_fee: deliveryFee,
          total,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          address: address.trim(),
          address_notes: addressNotes.trim() || null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          payment_method: payment,
          payment_status: 'pending',
          notes: notes.trim() || null,
          status: 'pending',
          user_id: userId || null,
        };

        sessionStorage.setItem('pendingOrder', JSON.stringify(orderPayload));
        
        setTimeout(() => {
          redirectToVivaPayment(vivaResponse.orderCode);
        }, 100);
        return;
      }

      // Cash on delivery or pickup flow
      const isPickup = payment === 'pickup';
      const payload = {
        items: items.map((i) => ({ name: i.name, price: i.price, qty: i.qty, category: i.category })),
        subtotal,
        delivery_fee: deliveryFee,
        total,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        address: isPickup ? 'Παραλαβή από το μαγαζί' : address.trim(),
        address_notes: isPickup ? null : (addressNotes.trim() || null),
        lat: isPickup ? null : (coords?.lat ?? null),
        lng: isPickup ? null : (coords?.lng ?? null),
        payment_method: payment,
        payment_status: 'pending',
        notes: notes.trim() || null,
        status: 'pending',
        user_id: userId || null,
      };

      let data: OrderResult | undefined;
      try {
        data = await Promise.race([
          createOrder(payload),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Database timeout - please check your connection')), 10000)
          )
        ]);
      } catch (err) {
        console.error('Order creation error:', err);
        throw new Error(err instanceof Error ? err.message : 'Failed to save order');
      }

      if (!data || !data.id) {
        throw new Error('Failed to create order - no data returned');
      }

      console.log('Order created successfully, ID:', data.id);
      clear();

      window.location.href = `/order-success?id=${data.id}`;
    } catch (e) {
      console.error('Order submission error:', e);
      const msg = e instanceof Error ? e.message : 'Κάτι πήγε στραβά. Δοκίμασε ξανά.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    items,
    name,
    phone,
    address,
    addressNotes,
    notes,
    coords,
    payment,
    userId,
    setSubmitting,
    setError,
    clear,
  ]);

  const submitState: CheckoutSubmitState = {
    submitting: useCheckoutStore((s) => s.submitting),
    error: useCheckoutStore((s) => s.error),
  };

  return {
    submitOrder,
    ...submitState,
  };
}
