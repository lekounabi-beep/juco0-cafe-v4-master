/**
 * Checkout feature type definitions
 */

import type { CheckoutAddress } from "@/features/location/types/address";

export type FulfillmentMethod = "delivery" | "pickup";
export type PaymentMethod = "cod" | "card";

export interface CheckoutFormData {
  fulfillment: FulfillmentMethod;
  name: string;
  phone: string;
  deliveryAddress: CheckoutAddress | null;
  floor: string;
  bell: string;
  deliveryInstructions: string;
  notes: string;
  payment: PaymentMethod;
}

export interface CheckoutValidation {
  canSubmit: boolean;
  errors: Record<string, string>;
  firstInvalidField: string | null;
}

export interface CheckoutSubmitState {
  submitting: boolean;
  error: string | null;
}
