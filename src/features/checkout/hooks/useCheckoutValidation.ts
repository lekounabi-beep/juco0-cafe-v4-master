/**
 * Checkout Validation hook - validates form data
 */

import { useMemo } from 'react';
import { useCheckoutStore } from '../store/checkout-store';
import { useCart } from '@/lib/cart-store';
import { validators } from '@/shared/utils/validation';
import type { CheckoutValidation } from '../types/checkout.types';

export function useCheckoutValidation() {
  const { name, phone, address, payment } = useCheckoutStore();
  const items = useCart((s) => s.items);

  const validation: CheckoutValidation = useMemo(() => {
    const errors: Record<string, string> = {};

    // Step 2 validation
    if (!validators.name(name)) {
      errors.name = 'Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες';
    }
    if (!validators.phone(phone)) {
      errors.phone = 'Παρακαλώ εισάγετε ένα έγκυρο τηλέφωνο';
    }
    // Only validate address if not pickup
    if (payment !== 'pickup' && !validators.address(address)) {
      errors.address = 'Η διεύθυνση πρέπει να έχει τουλάχιστον 5 χαρακτήρες';
    }

    const addressValid = payment === 'pickup' || validators.address(address);
    return {
      canStep2: items.length > 0,
      canStep3: validators.name(name) && validators.phone(phone) && addressValid,
      errors,
    };
  }, [name, phone, address, payment, items]);

  return validation;
}
