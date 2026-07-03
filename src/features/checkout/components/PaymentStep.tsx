import { Smartphone, Banknote } from "lucide-react";
import { PayOption } from "./PayOption";
import { useCheckoutForm } from "../hooks/useCheckoutForm";
import { PAYMENT_METHODS } from "@/config/constants";

export function PaymentStep() {
  const { fulfillment, payment, setPayment } = useCheckoutForm();
  const cashTitle = fulfillment === "pickup" ? "Πληρωμή στο κατάστημα" : "Μετρητά στην παράδοση";
  const cashSubtitle =
    fulfillment === "pickup" ? "Πληρώνεις όταν παραλάβεις" : "Πληρώνεις τον διανομέα";

  return (
    <section className="space-y-3 rounded-3xl glass p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-white/50">
          Βήμα {fulfillment === "delivery" ? "4" : "3"}
        </p>
        <h2 className="text-lg font-semibold text-white">Πληρωμή</h2>
        <p className="mt-1 text-sm text-white/55">
          Η πληρωμή είναι ξεχωριστή από την επιλογή παράδοσης ή παραλαβής.
        </p>
      </div>

      <div className="grid gap-3">
        <PayOption
          active={payment === PAYMENT_METHODS.CARD}
          onClick={() => setPayment(PAYMENT_METHODS.CARD)}
          icon={<Smartphone className="h-5 w-5" />}
          title="Κάρτα / Apple Pay / Google Pay"
          subtitle="Ασφαλής πληρωμή (demo)"
          badge="DEMO"
        />
        <PayOption
          active={payment === PAYMENT_METHODS.COD}
          onClick={() => setPayment(PAYMENT_METHODS.COD)}
          icon={<Banknote className="h-5 w-5" />}
          title={cashTitle}
          subtitle={cashSubtitle}
        />
      </div>
    </section>
  );
}
