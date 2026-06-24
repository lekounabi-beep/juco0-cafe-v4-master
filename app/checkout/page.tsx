"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { EspressoBackground } from "@/components/EspressoBackground";
import { CheckoutStepper } from "@/features/checkout/components/CheckoutStepper";
import { CartStep } from "@/features/checkout/components/CartStep";
import dynamic from "next/dynamic";
import { PaymentStep } from "@/features/checkout/components/PaymentStep";
import { EmptyCart } from "@/features/checkout/components/EmptyCart";
import { useCheckoutFlow } from "@/features/checkout/hooks/useCheckoutFlow";
import { useCheckoutStore } from "@/features/checkout/store/checkout-store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getProfile } from "@/integrations/supabase/services/profile.service";
import { useCart } from "@/lib/cart-store";
import { formatEur } from "@/shared/utils/currency";
import { calcDeliveryFee } from "@/shared/utils/currency";

const DeliveryStep = dynamic(() => import("@/features/checkout/components/DeliveryStep").then(mod => ({ default: mod.DeliveryStep })), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
  ssr: false,
});

function CheckoutPage() {
  const { step, nextStep, prevStep, validation } = useCheckoutFlow();
  const { user } = useAuth();
  const setUserId = useCheckoutStore((s) => s.setUserId);
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const deliveryFee = calcDeliveryFee(subtotal);
  const total = subtotal + deliveryFee;

  useEffect(() => {
    async function syncProfileId() {
      if (!user) {
        setUserId(null);
        return;
      }
      try {
        const profile = await getProfile(user.id);
        setUserId(profile?.id ?? null);
      } catch {
        setUserId(null);
      }
    }
    syncProfileId();
  }, [user, setUserId]);

  if (items.length === 0 && step !== 3) {
    return <EmptyCart />;
  }

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <Link href="/" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <h1 className="font-display text-lg font-semibold text-white">Ολοκλήρωση Παραγγελίας</h1>
        </div>
        <CheckoutStepper />
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-6">
        {step === 1 && <CartStep />}
        {step === 2 && <DeliveryStep />}
        {step === 3 && <PaymentStep />}
      </main>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Πίσω
            </button>
          )}
          <div className="flex-1 text-right text-xs text-white/60">
            Σύνολο
            <div className="text-base font-bold text-white">{formatEur(total)}</div>
          </div>
          {step < 3 ? (
            <button
              onClick={nextStep}
              disabled={(step === 1 && !validation.canStep2) || (step === 2 && !validation.canStep3)}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Συνέχεια
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
