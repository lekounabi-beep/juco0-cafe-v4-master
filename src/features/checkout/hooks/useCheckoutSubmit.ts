/**
 * Checkout Submit hook - handles order submission
 */

import { useCallback, useRef } from "react";
import { useCheckoutStore } from "../store/checkout-store";
import { useCart } from "@/lib/cart-store";
import { createOrder, type OrderResult } from "@/integrations/supabase/services/order.service";
import {
  createVivaOrderCode,
  redirectToVivaPayment,
} from "@/integrations/viva/services/payment.service";
import { calcDeliveryFee } from "@/shared/utils/currency";
import {
  isCompleteCheckoutAddress,
  isValidCheckoutAddress,
} from "@/features/location/services/address-parser";
import { normalizeGreekPhone, validators } from "@/shared/utils/validation";
import type { CheckoutSubmitState } from "../types/checkout.types";

function buildDeliveryNotes(floor: string, bell: string, instructions: string) {
  return (
    [
      floor.trim() ? `Όροφος: ${floor.trim()}` : null,
      bell.trim() ? `Κουδούνι: ${bell.trim()}` : null,
      instructions.trim() ? instructions.trim() : null,
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
    error.message.includes("περιοχής")
  ) {
    return error.message;
  }

  return fallback;
}

export function useCheckoutSubmit() {
  const submitLockRef = useRef(false);
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
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

    try {
      const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
      const isPickup = fulfillment === "pickup";
      const deliveryFee = isPickup ? 0 : calcDeliveryFee(subtotal);
      const total = subtotal + deliveryFee;
      const deliveryNotes = isPickup ? null : buildDeliveryNotes(floor, bell, deliveryInstructions);
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

      // Card payment flow
      if (payment === "card") {
        const vivaResponse = await Promise.race([
          createVivaOrderCode(total, {
            email: undefined,
            fullName: name.trim(),
            phone: normalizedPhone,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Viva Wallet API timeout")), 15000),
          ),
        ]);

        console.log("Viva Wallet response:", vivaResponse);

        if (!vivaResponse.orderCode) {
          throw new Error(vivaResponse.errorText || "Failed to create Viva Wallet order");
        }

        // Store order data in sessionStorage
        const orderPayload = {
          items: items.map((i) => ({
            name: i.name,
            price: i.price,
            qty: i.qty,
            category: i.category,
          })),
          subtotal,
          delivery_fee: deliveryFee,
          total,
          customer_name: name.trim(),
          customer_phone: normalizedPhone,
          address,
          address_notes: deliveryNotes,
          lat,
          lng,
          payment_method: payment,
          payment_status: "pending",
          notes: notes.trim() || null,
          status: "pending",
          user_id: userId || null,
        };

        sessionStorage.setItem("pendingOrder", JSON.stringify(orderPayload));

        releaseSubmitLock = false;
        setTimeout(() => {
          redirectToVivaPayment(vivaResponse.orderCode);
        }, 100);
        return;
      }

      // Cash on delivery or pickup flow
      const payload = {
        items: items.map((i) => ({
          name: i.name,
          price: i.price,
          qty: i.qty,
          category: i.category,
        })),
        subtotal,
        delivery_fee: deliveryFee,
        total,
        customer_name: name.trim(),
        customer_phone: normalizedPhone,
        address,
        address_notes: deliveryNotes,
        lat,
        lng,
        payment_method: payment,
        payment_status: "pending",
        notes: notes.trim() || null,
        status: "pending",
        user_id: userId || null,
      };

      let data: OrderResult | undefined;
      try {
        data = await Promise.race([
          createOrder(payload),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Database timeout - please check your connection")),
              10000,
            ),
          ),
        ]);
      } catch (err) {
        console.error("Order creation error:", err);
        throw new Error(err instanceof Error ? err.message : "Failed to save order");
      }

      if (!data || !data.id) {
        throw new Error("Failed to create order - no data returned");
      }

      console.log("Order created successfully, ID:", data.id);
      clear();

      releaseSubmitLock = false;
      window.location.href = `/track/${data.id}`;
    } catch (e) {
      console.error("Order submission error:", e);
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
    floor,
    bell,
    deliveryInstructions,
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
