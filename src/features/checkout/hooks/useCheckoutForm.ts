/**
 * Checkout Form hook - manages form state
 */

import { useCheckoutStore } from '../store/checkout-store';
import type { CheckoutFormData, PaymentMethod } from '../types/checkout.types';

export function useCheckoutForm() {
  const {
    name,
    phone,
    address,
    addressNotes,
    notes,
    coords,
    payment,
    setName,
    setPhone,
    setAddress,
    setAddressNotes,
    setNotes,
    setCoords,
    setPayment,
  } = useCheckoutStore();

  const formData: CheckoutFormData = {
    name,
    phone,
    address,
    addressNotes,
    notes,
    coords,
    payment,
  };

  return {
    ...formData,
    setName,
    setPhone,
    setAddress,
    setAddressNotes,
    setNotes,
    setCoords,
    setPayment,
  };
}
