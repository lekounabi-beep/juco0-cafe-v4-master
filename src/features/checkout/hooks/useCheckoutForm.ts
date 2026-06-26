/**
 * Checkout Form hook - manages form state
 */

import { useCheckoutStore } from "../store/checkout-store";
import type { CheckoutFormData } from "../types/checkout.types";

export function useCheckoutForm() {
  const {
    fulfillment,
    name,
    phone,
    deliveryAddress,
    floor,
    bell,
    deliveryInstructions,
    notes,
    payment,
    setFulfillment,
    setName,
    setPhone,
    setDeliveryAddress,
    setFloor,
    setBell,
    setDeliveryInstructions,
    setNotes,
    setPayment,
  } = useCheckoutStore();

  const formData: CheckoutFormData = {
    fulfillment,
    name,
    phone,
    deliveryAddress,
    floor,
    bell,
    deliveryInstructions,
    notes,
    payment,
  };

  return {
    ...formData,
    address: deliveryAddress?.formattedAddress ?? "",
    setFulfillment,
    setName,
    setPhone,
    setDeliveryAddress,
    setFloor,
    setBell,
    setDeliveryInstructions,
    setNotes,
    setPayment,
  };
}
