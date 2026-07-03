"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EspressoBackground } from "@/components/EspressoBackground";
import { FulfillmentStep } from "@/features/checkout/components/FulfillmentStep";
import { ContactStep } from "@/features/checkout/components/ContactStep";
import { AddressStep } from "@/features/checkout/components/AddressStep";
import { PaymentStep } from "@/features/checkout/components/PaymentStep";
import { ReviewStep } from "@/features/checkout/components/ReviewStep";
import { StickyCheckoutCta } from "@/features/checkout/components/StickyCheckoutCta";
import { EmptyCart } from "@/features/checkout/components/EmptyCart";
import { CheckoutAddressPicker } from "@/features/location/components/CheckoutAddressPicker";
import { useCheckoutForm } from "@/features/checkout/hooks/useCheckoutForm";
import { useCheckoutValidation } from "@/features/checkout/hooks/useCheckoutValidation";
import { useCheckoutSubmit } from "@/features/checkout/hooks/useCheckoutSubmit";
import { useCheckoutStore } from "@/features/checkout/store/checkout-store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { resolveAccountProfileId } from "@/features/account/lib/account-profile-cache";
import { useCart } from "@/lib/cart-store";
import { calcDeliveryFee } from "@/shared/utils/currency";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  hasVivaReturnParams,
  VivaCheckoutReturnRedirect,
} from "@/features/checkout/components/VivaCheckoutReturnHandler";

const SECTION_FOR_FIELD: Record<string, string> = {
  items: "review",
  phone: "contact",
  name: "contact",
  address: "address",
};

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const isVivaReturn = hasVivaReturnParams(searchParams);

  if (isVivaReturn) {
    return <VivaCheckoutReturnRedirect />;
  }

  return <CheckoutPageBody />;
}

function CheckoutPageBody() {
  const { user } = useAuth();
  const setUserId = useCheckoutStore((s) => s.setUserId);
  const deliveryAddress = useCheckoutStore((s) => s.deliveryAddress);
  const setDeliveryAddress = useCheckoutStore((s) => s.setDeliveryAddress);
  const { fulfillment, payment } = useCheckoutForm();
  const validation = useCheckoutValidation();
  const { submitOrder, submitting, error } = useCheckoutSubmit();
  const [isAddressPickerOpen, setAddressPickerOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const addressActionRef = useRef<HTMLButtonElement | null>(null);
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const { isOnline, isHydrated } = useNetworkStatus();
  const isOfflineBlocked = isHydrated && !isOnline;
  const isPickup = fulfillment === "pickup";
  const deliveryFee = isPickup ? 0 : calcDeliveryFee(subtotal);
  const total = subtotal + deliveryFee;
  const addressError = showErrors ? validation.errors.address : undefined;

  useEffect(() => {
    async function syncProfileId() {
      if (!user) {
        setUserId(null);
        return;
      }
      try {
        const profileId = await resolveAccountProfileId(
          user.id,
          user.email,
          user.user_metadata?.full_name || user.user_metadata?.name,
        );
        setUserId(profileId ?? null);
      } catch {
        setUserId(null);
      }
    }
    syncProfileId();
  }, [user, setUserId]);

  const setSectionRef = useMemo(
    () => (id: string) => (node: HTMLElement | null) => {
      sectionRefs.current[id] = node;
    },
    [],
  );

  const scrollToFirstError = () => {
    const firstInvalidField = validation.firstInvalidField;
    const sectionId = firstInvalidField ? SECTION_FOR_FIELD[firstInvalidField] : null;
    if (!sectionId) return;
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      if (firstInvalidField === "phone") phoneRef.current?.focus();
      if (firstInvalidField === "name") nameRef.current?.focus();
      if (firstInvalidField === "address") addressActionRef.current?.focus();
    }, 250);
  };

  const handleSubmit = async () => {
    setShowErrors(true);
    setValidationAttempt((attempt) => attempt + 1);
    if (!validation.canSubmit) {
      scrollToFirstError();
      return;
    }
    await submitOrder();
  };

  if (items.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-lg font-semibold text-white">Ολοκλήρωση Παραγγελίας</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-6">
        <div className="space-y-4 animate-fade-up">
          <div ref={setSectionRef("fulfillment")}>
            <FulfillmentStep />
          </div>

          <div ref={setSectionRef("contact")}>
            <ContactStep
              errors={validation.errors}
              showErrors={showErrors}
              validationAttempt={validationAttempt}
              phoneRef={phoneRef}
              nameRef={nameRef}
            />
          </div>

          {!isPickup && (
            <>
              <div ref={setSectionRef("address")}>
                <AddressStep
                  onOpenAddressPicker={() => setAddressPickerOpen(true)}
                  error={addressError}
                  actionRef={addressActionRef}
                />
              </div>
            </>
          )}

          <div ref={setSectionRef("payment")}>
            <PaymentStep />
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
              {error}
            </div>
          )}

          <div ref={setSectionRef("review")}>
            <ReviewStep onEditAddress={() => setAddressPickerOpen(true)} />
          </div>
        </div>
      </main>

      <CheckoutAddressPicker
        isOpen={isAddressPickerOpen}
        initialAddress={deliveryAddress}
        onClose={() => setAddressPickerOpen(false)}
        onConfirm={setDeliveryAddress}
      />

      <StickyCheckoutCta
        total={total}
        submitting={submitting}
        payment={payment}
        onSubmit={handleSubmit}
        disabled={isOfflineBlocked}
        disabledReason={
          isOfflineBlocked ? "Internet connection is required to complete your order." : undefined
        }
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen text-foreground">
          <EspressoBackground />
          <main className="relative z-10 mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4">
            <p className="text-white/60">Φόρτωση...</p>
          </main>
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
