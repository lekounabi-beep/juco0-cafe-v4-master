/**
 * Checkout Location Store
 * Manages delivery location state for checkout flow
 */

import { create } from 'zustand';
import type { Coordinates } from '@/shared/types/common.types';

interface DeliveryLocation {
  formatted_address: string;
  lat: number;
  lng: number;
  place_id?: string;
  plus_code?: string;
  entrance_notes?: string;
}

interface CheckoutLocationState {
  // State
  location: DeliveryLocation | null;
  isLocationPickerOpen: boolean;
  isDeliveryAvailable: boolean | null;
  
  // Actions
  setLocation: (location: DeliveryLocation) => void;
  setLocationPickerOpen: (open: boolean) => void;
  setDeliveryAvailable: (available: boolean) => void;
  clearLocation: () => void;
  reset: () => void;
}

const initialState = {
  location: null,
  isLocationPickerOpen: false,
  isDeliveryAvailable: null,
};

export const useCheckoutLocationStore = create<CheckoutLocationState>((set) => ({
  ...initialState,
  
  setLocation: (location) => set({ location }),
  setLocationPickerOpen: (open) => set({ isLocationPickerOpen: open }),
  setDeliveryAvailable: (available) => set({ isDeliveryAvailable: available }),
  clearLocation: () => set({ location: null, isDeliveryAvailable: null }),
  
  reset: () => set(initialState),
}));
