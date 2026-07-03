/**
 * Checkout Submit hook - handles order submission via server-authoritative pricing.
 */

import { useCallback, useRef } from "react";
import { useCheckoutStore } from "../store/checkout-store";
import { useCart } from "@/lib/cart-store";
import {
  submitCodOrderServer,
  initiateCardCheckoutServer,
  type CheckoutCustomerInput,
} from "@app/actions/checkout-order";
import { redirectToVivaPayment } from "@/integrations/viva/services/payment.service";
import {
  isCompleteCheckoutAddress,
  isValidCheckoutAddress,
} from "@/features/location/services/address-parser";
import { normalizeGreekPhone, validators } from "@/shared/utils/validation";
import { captureException } from "@/lib/monitoring";
import type { CheckoutSubmitState } from "../types/checkout.types";

const CHECKOUT_TOKEN_BACKUP_KEY = "juco_checkout_token";
const CARD_ORDER_ID_KEY = "juco_card_order_id";

function buildDeliveryNotes(address: {
  floor?: string;
  bell?: string;
  deliveryPreferences?: string[];
  notes?: string;
}) {
  return (
    [
      address.floor?.trim() ? `Όροφος: ${address.floor.trim()}` : null,
      address.bell?.trim() ? `Κουδούνι: ${address.bell.trim()}` : null,
      address.deliveryPreferences?.length ? address.deliveryPreferences.join(", ") : null,
      address.notes?.trim() ? address.notes.trim() : null,
    ]
      .filter(Boolean)
      .join(" · ") || null
  );
}

function buildSubmittedAddress(address: {
  formattedAddress: string;
  street: string;
  number: string;
  city: string;
  postalCode: string;
}) {
  const line = [address.street, address.number].filter(Boolean).join(" ");
  const area = [address.city, address.postalCode].filter(Boolean).join(", ");
  return [line || address.formattedAddress, area].filter(Boolean).join(", ");
}

function customerSafeError(error: unknown, payment: string) {
  const fallback =
    payment === "card"
      ? "Δεν μπορέσαμε να ξεκινήσουμε την πληρωμή. Δεν έχει γίνει χρέωση. Δοκιμάστε ξανά ή επικοινωνήστε με το κατάστημα."
      : "Δεν μπορέσαμε να ολοκληρώσουμε την παραγγελία αυτή τη στιγμή. Δοκιμάστε ξανά ή επικοινωνήστε με το κατάστημα.";

  if (!(error instanceof Error)) return fallback;

  if (
    error.message.includes("τηλέφωνο") ||
    error.message.includes("όνομα") ||
    error.message.includes("διεύθυνση") ||
    error.message.includes("καλάθι") ||
    error.message.includes("περιοχής") ||
    error.message.includes("προϊόν")
  ) {
    return error.message;
  }

  return fallback;
}

export function useCheckoutSubmit() {
  const submitLockRef = useRef(false);
  const clientRequestIdRef = useRef<string | null>(null);
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const {
    fulfillment,
    name,
    phone,
    deliveryAddress,
    notes,
    payment,
    userId,
    setSubmitting,
    setError,
  } = useCheckoutStore();

  const submitOrder = useCallback(async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    let releaseSubmitLock = true;

    setSubmitting(true);
    setError(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("Internet connection is required to complete your order.");
      submitLockRef.current = false;
      setSubmitting(false);
      return;
    }

    try {
      const isPickup = fulfillment === "pickup";
      const deliveryNotes =
        isPickup || !deliveryAddress ? null : buildDeliveryNotes(deliveryAddress);
      const normalizedPhone = normalizeGreekPhone(phone);

      if (items.length === 0) {
        throw new Error("Το καλάθι σου είναι άδειο");
      }
      if (!phone.trim()) {
        throw new Error("Συμπληρώστε το τηλέφωνό σας.");
      }
      if (!validators.phone(phone)) {
        throw new Error("Συμπληρώστε έγκυρο τηλέφωνο επικοινωνίας.");
      }
      if (!validators.name(name)) {
        throw new Error("Συμπληρώστε το όνομά σας.");
      }

      let address = "Παραλαβή από το μαγαζί";
      let lat: number | null = null;
      let lng: number | null = null;

      if (!isPickup) {
        const candidateAddress = deliveryAddress;
        if (!isValidCheckoutAddress(candidateAddress)) {
          throw new Error("Επιλέξτε διεύθυνση παράδοσης.");
        }
        if (!isCompleteCheckoutAddress(candidateAddress)) {
          if (candidateAddress.deliveryZone?.isAvailable === false) {
            throw new Error("Η διεύθυνση βρίσκεται εκτός περιοχής εξυπηρέτησης.");
          }
          throw new Error("Επιλέξτε πλήρη διεύθυνση παράδοσης.");
        }
        address = buildSubmittedAddress(candidateAddress);
        lat = candidateAddress.lat;
        lng = candidateAddress.lng;
      }

      if (!clientRequestIdRef.current) {
        clientRequestIdRef.current = crypto.randomUUID();
      }
      const clientRequestId = clientRequestIdRef.current;

      const checkoutInput: CheckoutCustomerInput = {
        fulfillment: isPickup ? "pickup" : "delivery",
        cartItems: items.map((i) => ({
          name: i.name,
          qty: i.qty,
          category: i.category,
        })),
        customer_name: name.trim(),
        customer_phone: normalizedPhone,
        address,
        address_notes: deliveryNotes,
        lat,
        lng,
        payment_method: payment,
        notes: notes.trim() || null,
        user_id: userId || null,
      };

      if (payment === "card") {
        const { checkoutToken, orderCode, orderId } = await Promise.race([
          initiateCardCheckoutServer(checkoutInput, clientRequestId),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Viva Wallet API timeout")), 30000),
          ),
        ]);

        sessionStorage.setItem("checkoutToken", checkoutToken);
        localStorage.setItem(CHECKOUT_TOKEN_BACKUP_KEY, checkoutToken);
        localStorage.setItem(CARD_ORDER_ID_KEY, orderId);
        sessionStorage.removeItem("pendingOrder");

        setSubmitting(false);
        submitLockRef.current = false;
        releaseSubmitLock = false;
        setTimeout(() => {
          redirectToVivaPayment(orderCode);
        }, 100);
        return;
      }

      const data = await Promise.race([
        submitCodOrderServer(checkoutInput, clientRequestId),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Database timeout - please check your connection")),
            10000,
          ),
        ),
      ]);

      if (!data?.id) {
        throw new Error("Failed to create order - no data returned");
      }

      clientRequestIdRef.current = null;
      clear();

      releaseSubmitLock = false;
      window.location.href = `/track/${data.id}`;
    } catch (e) {
      captureException(e, { scope: "checkout.submit" });
      setError(customerSafeError(e, payment));
    } finally {
      if (releaseSubmitLock) {
        submitLockRef.current = false;
        setSubmitting(false);
      }
    }
  }, [
    items,
    fulfillment,
    name,
    phone,
    deliveryAddress,
    notes,
    payment,
    userId,
    setSubmitting,
    setError,
    clear,
  ]);

  const submitState: CheckoutSubmitState = {
    submitting: useCheckoutStore((s) => s.submitting),
    error: useCheckoutStore((s) => s.error),
  };

  return {
    submitOrder,
    ...submitState,
  };
}
