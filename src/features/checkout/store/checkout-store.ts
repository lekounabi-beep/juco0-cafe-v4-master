/**
 * Checkout store using Zustand
 * Manages checkout state across the flow
 */

import { create } from "zustand";
import type {
  CheckoutFormData,
  CheckoutSubmitState,
  FulfillmentMethod,
  PaymentMethod,
} from "../types/checkout.types";
import type { CheckoutAddress } from "@/features/location/types/address";

interface CheckoutState extends CheckoutFormData, CheckoutSubmitState {
  userId: string | null;

  // Actions
  setFulfillment: (fulfillment: FulfillmentMethod) => void;
  setName: (name: string) => void;
  setPhone: (phone: string) => void;
  setDeliveryAddress: (address: CheckoutAddress | null) => void;
  setFloor: (floor: string) => void;
  setBell: (bell: string) => void;
  setDeliveryInstructions: (deliveryInstructions: string) => void;
  setNotes: (notes: string) => void;
  setPayment: (payment: PaymentMethod) => void;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  setUserId: (userId: string | null) => void;
  reset: () => void;
}

const initialFormData: CheckoutFormData = {
  fulfillment: "delivery",
  name: "",
  phone: "",
  deliveryAddress: null,
  floor: "",
  bell: "",
  deliveryInstructions: "",
  notes: "",
  payment: "cod",
};

const initialSubmitState: CheckoutSubmitState = {
  submitting: false,
  error: null,
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  userId: null,
  ...initialFormData,
  ...initialSubmitState,

  setFulfillment: (fulfillment) => set({ fulfillment }),
  setName: (name) => set({ name }),
  setPhone: (phone) => set({ phone }),
  setDeliveryAddress: (deliveryAddress) => set({ deliveryAddress }),
  setFloor: (floor) => set({ floor }),
  setBell: (bell) => set({ bell }),
  setDeliveryInstructions: (deliveryInstructions) => set({ deliveryInstructions }),
  setNotes: (notes) => set({ notes }),
  setPayment: (payment) => set({ payment }),
  setSubmitting: (submitting) => set({ submitting }),
  setError: (error) => set({ error }),
  setUserId: (userId) => set({ userId }),

  reset: () =>
    set({
      userId: null,
      ...initialFormData,
      ...initialSubmitState,
    }),
}));
