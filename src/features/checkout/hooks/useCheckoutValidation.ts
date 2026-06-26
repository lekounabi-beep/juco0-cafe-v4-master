/**
 * Checkout Validation hook - validates form data
 */

import { useMemo } from "react";
import { useCheckoutStore } from "../store/checkout-store";
import { useCart } from "@/lib/cart-store";
import { validators } from "@/shared/utils/validation";
import {
  hasStreetNumber,
  isCompleteCheckoutAddress,
  isValidCheckoutAddress,
} from "@/features/location/services/address-parser";
import type { CheckoutValidation } from "../types/checkout.types";

export function useCheckoutValidation() {
  const { fulfillment, name, phone, deliveryAddress } = useCheckoutStore();
  const items = useCart((s) => s.items);

  const validation: CheckoutValidation = useMemo(() => {
    const errors: Record<string, string> = {};
    const isDelivery = fulfillment === "delivery";

    if (items.length === 0) {
      errors.items = "Το καλάθι σου είναι άδειο";
    }
    if (!phone.trim()) {
      errors.phone = "Συμπληρώστε το τηλέφωνό σας.";
    } else if (!validators.phone(phone)) {
      errors.phone = "Συμπληρώστε έγκυρο τηλέφωνο επικοινωνίας.";
    }
    if (!validators.name(name)) {
      errors.name = "Συμπληρώστε το όνομά σας.";
    }
    const addressValid = !isDelivery || isCompleteCheckoutAddress(deliveryAddress);

    if (isDelivery) {
      if (!isValidCheckoutAddress(deliveryAddress)) {
        errors.address = "Επιλέξτε διεύθυνση παράδοσης.";
      } else if (deliveryAddress.deliveryZone?.isAvailable === false) {
        errors.address = "Η διεύθυνση βρίσκεται εκτός περιοχής εξυπηρέτησης.";
      } else if (deliveryAddress.deliveryZone?.isAvailable !== true) {
        errors.address = "Επιβεβαιώστε ότι η περιοχή εξυπηρετείται.";
      } else if (!hasStreetNumber(deliveryAddress) && !deliveryAddress.manualPinConfirmed) {
        errors.address =
          "Συμπληρώστε αριθμό οδού ή επιβεβαιώστε ότι η τοποθεσία στον χάρτη είναι ακριβής.";
      }
    }

    const firstInvalidField =
      ["items", "phone", "name", "address"].find((field) => errors[field]) ?? null;

    return {
      canSubmit: Object.keys(errors).length === 0,
      errors,
      firstInvalidField,
    };
  }, [fulfillment, name, phone, deliveryAddress, items]);

  return validation;
}
