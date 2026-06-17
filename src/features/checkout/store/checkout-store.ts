/**
 * Checkout store using Zustand
 * Manages checkout state across the flow
 */

import { create } from 'zustand';
import type { CheckoutStep, CheckoutFormData, CheckoutSubmitState, PaymentMethod } from '../types/checkout.types';
import type { Coordinates } from '@/shared/types/common.types';

interface CheckoutState extends CheckoutFormData, CheckoutSubmitState {
  step: CheckoutStep;
  userId: string | null;
  
  // Actions
  setStep: (step: CheckoutStep) => void;
  setName: (name: string) => void;
  setPhone: (phone: string) => void;
  setAddress: (address: string) => void;
  setAddressNotes: (notes: string) => void;
  setNotes: (notes: string) => void;
  setCoords: (coords: Coordinates | null) => void;
  setPayment: (payment: PaymentMethod) => void;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  setUserId: (userId: string | null) => void;
  reset: () => void;
}

const initialFormData: CheckoutFormData = {
  name: '',
  phone: '',
  address: '',
  addressNotes: '',
  notes: '',
  coords: null,
  payment: 'cod',
};

const initialSubmitState: CheckoutSubmitState = {
  submitting: false,
  error: null,
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  step: 1,
  userId: null,
  ...initialFormData,
  ...initialSubmitState,
  
  setStep: (step) => set({ step }),
  setName: (name) => set({ name }),
  setPhone: (phone) => set({ phone }),
  setAddress: (address) => set({ address }),
  setAddressNotes: (addressNotes) => set({ addressNotes }),
  setNotes: (notes) => set({ notes }),
  setCoords: (coords) => set({ coords }),
  setPayment: (payment) => set({ payment }),
  setSubmitting: (submitting) => set({ submitting }),
  setError: (error) => set({ error }),
  setUserId: (userId) => set({ userId }),
  
  reset: () => set({
    step: 1,
    userId: null,
    ...initialFormData,
    ...initialSubmitState,
  }),
}));
