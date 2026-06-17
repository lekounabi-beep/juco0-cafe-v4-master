/**
 * Payment Step component - Step 3 of checkout
 */

import { Smartphone, Banknote, Store, CheckCircle2, Loader2 } from 'lucide-react';
import { PayOption } from './PayOption';
import { CartSummary } from '@/features/cart/components/CartSummary';
import { useCheckoutForm } from '../hooks/useCheckoutForm';
import { useCheckoutSubmit } from '../hooks/useCheckoutSubmit';
import { useCart } from '@/lib/cart-store';
import { calcDeliveryFee } from '@/shared/utils/currency';
import { PAYMENT_METHODS } from '@/config/constants';

export function PaymentStep() {
  const { payment, setPayment, name, phone, address, addressNotes } = useCheckoutForm();
  const { submitOrder, submitting, error } = useCheckoutSubmit();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const deliveryFee = payment === PAYMENT_METHODS.PICKUP ? 0 : calcDeliveryFee(subtotal);
  const total = subtotal + deliveryFee;

  return (
    <section className="space-y-4 animate-fade-up">
      <h2 className="text-xl font-semibold text-white">Τρόπος παραλαβής & πληρωμής</h2>

      <div className="grid gap-3">
        <PayOption
          active={payment === PAYMENT_METHODS.PICKUP}
          onClick={() => setPayment(PAYMENT_METHODS.PICKUP)}
          icon={<Store className="h-5 w-5" />}
          title="Παραλαβή από το μαγαζί"
          subtitle="Δωρεάν - Παραλαβή στο κατάστημα"
        />
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
          title="Μετρητά στην παράδοση"
          subtitle="Πληρώνεις τον διανομέα"
        />
      </div>

      <div className="rounded-2xl glass p-4">
        <h3 className="text-sm font-semibold text-white">Σύνοψη</h3>
        <CartSummary subtotal={subtotal} deliveryFee={deliveryFee} total={total} compact />
        <div className="mt-3 space-y-1 text-xs text-white/65">
          <p><strong className="text-white/85">Παραλήπτης:</strong> {name}</p>
          <p><strong className="text-white/85">Τηλέφωνο:</strong> {phone}</p>
          {payment !== PAYMENT_METHODS.PICKUP && (
            <p><strong className="text-white/85">Διεύθυνση:</strong> {address}{addressNotes ? `, ${addressNotes}` : ""}</p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <button
        onClick={submitOrder}
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 w-full"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {submitting ? "Επεξεργασία..." : payment === PAYMENT_METHODS.CARD ? "Πληρωμή & Αποστολή" : payment === PAYMENT_METHODS.PICKUP ? "Παραγγελία" : "Αποστολή"}
      </button>
    </section>
  );
}
