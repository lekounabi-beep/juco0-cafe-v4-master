/**
 * Checkout Stepper component
 */

import { ShoppingBag, MapPin, CreditCard, CheckCircle2 } from 'lucide-react';
import { useCheckoutStore } from '../store/checkout-store';
import type { CheckoutStep } from '../types/checkout.types';

export function CheckoutStepper() {
  const step = useCheckoutStore((s) => s.step);

  const steps = [
    { n: 1 as CheckoutStep, label: "Καλάθι", Icon: ShoppingBag },
    { n: 2 as CheckoutStep, label: "Παράδοση", Icon: MapPin },
    { n: 3 as CheckoutStep, label: "Πληρωμή", Icon: CreditCard },
  ] as const;

  return (
    <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pb-3">
      {steps.map(({ n, label, Icon }, i: number) => {
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold transition ${
                  done ? "bg-primary text-primary-foreground" : active ? "bg-primary text-primary-foreground ring-4 ring-primary/25" : "bg-white/10 text-white/60"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-[10px] uppercase tracking-wider ${active || done ? "text-white" : "text-white/50"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-px flex-1 ${step > n ? "bg-primary" : "bg-white/15"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
