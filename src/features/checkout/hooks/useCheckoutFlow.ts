/**
 * Checkout Flow hook - orchestrates checkout flow
 */

import { useCheckoutStore } from '../store/checkout-store';
import { useCheckoutForm } from './useCheckoutForm';
import { useCheckoutValidation } from './useCheckoutValidation';
import { useCheckoutSubmit } from './useCheckoutSubmit';
import type { CheckoutStep } from '../types/checkout.types';

export function useCheckoutFlow() {
  const { step, setStep } = useCheckoutStore();
  const form = useCheckoutForm();
  const validation = useCheckoutValidation();
  const submit = useCheckoutSubmit();

  const nextStep = () => {
    if (step === 1 && validation.canStep2) {
      setStep(2);
    } else if (step === 2 && validation.canStep3) {
      setStep(3);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep((step - 1) as CheckoutStep);
    }
  };

  return {
    step,
    setStep,
    nextStep,
    prevStep,
    form,
    validation,
    submit,
  };
}
