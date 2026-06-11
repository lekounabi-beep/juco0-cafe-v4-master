import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, calcDeliveryFee, formatEur, FREE_DELIVERY_THRESHOLD } from '@/lib/cart-store';
import { supabase } from '@/integrations/supabase/client';
import { createVivaOrderCode, redirectToVivaPayment } from '@/services/paymentService';

type Step = 1 | 2 | 3;
type PaymentMethod = 'cod' | 'card';

export function useCheckoutLogic() {
  const router = useRouter();
  const items = useCart((s: any) => s.items);
  const add = useCart((s: any) => s.add);
  const setQty = useCart((s: any) => s.setQty);
  const remove = useCart((s: any) => s.remove);
  const clear = useCart((s: any) => s.clear);

  const subtotal = items.reduce((sum: number, i: any) => sum + i.qty * i.price, 0);
  const deliveryFee = calcDeliveryFee(subtotal);
  const total = subtotal + deliveryFee;

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>('cod');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStep2 = items.length > 0;
  const canStep3 = name.trim().length >= 2 && /^[0-9+\s-]{8,}$/.test(phone.trim()) && address.trim().length >= 5;

  const submitOrder = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      // For card payment, use Viva Wallet Native Smart Checkout
      if (payment === 'card') {
        // Create Viva Wallet order code with timeout
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

        // Store order data in sessionStorage for retrieval after payment
        const orderPayload = {
          items: items.map((i: any) => ({ name: i.name, price: i.price, qty: i.qty, category: i.category })),
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
          payment_status: 'paid',
          notes: notes.trim() || null,
          status: 'pending',
        };

        sessionStorage.setItem('pendingOrder', JSON.stringify(orderPayload));
        
        // Small delay to ensure sessionStorage is set before redirect
        setTimeout(() => {
          redirectToVivaPayment(vivaResponse.orderCode);
        }, 100);
        return;
      }

      // For cash on delivery, proceed with normal flow
      const payload = {
        items: items.map((i: any) => ({ name: i.name, price: i.price, qty: i.qty, category: i.category })),
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
      };

      // Add timeout to Supabase insert
      const { data, error: insErr } = await Promise.race([
        supabase
          .from('orders')
          .insert(payload)
          .select('id, order_number')
          .single(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout - please check your connection')), 10000)
        )
      ]) as any;

      if (insErr) {
        console.error('Supabase insert error:', insErr);
        throw new Error(`Database error: ${insErr.message || 'Failed to save order'}`);
      }

      clear();
      router.push(`/order-success?id=${(data as { id: string }).id}`);
    } catch (e) {
      console.error('Order submission error:', e);
      const msg = e instanceof Error ? e.message : 'Κάτι πήγε στραβά. Δοκίμασε ξανά.';
      setError(msg);
      setSubmitting(false);
    }
  }, [items, total, name, phone, address, addressNotes, notes, coords, payment, clear, router]);

  return {
    // Cart
    items,
    add,
    setQty,
    remove,
    subtotal,
    deliveryFee,
    total,
    
    // Form state
    step,
    setStep,
    name,
    setName,
    phone,
    setPhone,
    address,
    setAddress,
    addressNotes,
    setAddressNotes,
    notes,
    setNotes,
    coords,
    setCoords,
    payment,
    setPayment,
    submitting,
    error,
    
    // Validation
    canStep2,
    canStep3,
    
    // Actions
    submitOrder,
    
    // Utilities
    formatEur,
    FREE_DELIVERY_THRESHOLD,
  };
}
