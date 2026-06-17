/**
 * Checkout feature type definitions
 */

import type { Coordinates } from '@/shared/types/common.types';

export type CheckoutStep = 1 | 2 | 3;
export type PaymentMethod = 'cod' | 'card' | 'pickup';

export interface CheckoutFormData {
  name: string;
  phone: string;
  address: string;
  addressNotes: string;
  notes: string;
  coords: Coordinates | null;
  payment: PaymentMethod;
}

export interface CheckoutValidation {
  canStep2: boolean;
  canStep3: boolean;
  errors: Record<string, string>;
}

export interface CheckoutSubmitState {
  submitting: boolean;
  error: string | null;
}
