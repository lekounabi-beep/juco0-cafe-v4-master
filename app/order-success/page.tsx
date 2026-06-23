"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Home, MapPin, Phone, Heart } from "lucide-react";
import { EspressoBackground } from "@/components/EspressoBackground";
import { formatEur } from "@/shared/utils/currency";
import { verifyVivaTransaction } from "@/integrations/viva/services/payment.service";
import { createOrder, getOrderById } from "@/integrations/supabase/services/order.service";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { GoogleButton } from "@/features/auth/components/GoogleButton";
import { z } from "zod";
import { useSearchParams } from "next/navigation";

const searchSchema = z.object({ 
  id: z.string().uuid().optional(),
  t: z.string().optional(),
});

type Order = {
  id: string;
  order_number: string;
  status: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  customer_name: string;
  customer_phone: string;
  address: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
};

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id") || undefined;
  const t = searchParams.get("t") || undefined;
  const { isAuthenticated, user } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processOrder() {
      try {
        console.log('Order success page - processing order');
        console.log('Transaction ID (t):', t);
        console.log('Order ID (id):', id);

        // Handle Viva Wallet callback
        if (t) {
          console.log('Processing Viva Wallet callback');

          // Retrieve pending order from sessionStorage
          const pendingOrderStr = sessionStorage.getItem("pendingOrder");
          console.log('Pending order from sessionStorage:', pendingOrderStr ? 'Found' : 'Not found');
          
          if (!pendingOrderStr) {
            console.error('No pending order found in sessionStorage');
            setError("Δεν βρέθηκε η παραγγελία. Παρακαλώ ξεκινήστε ξανά.");
            setLoading(false);
            return;
          }

          const pendingOrder = JSON.parse(pendingOrderStr);
          console.log('Pending order data:', pendingOrder);
          
          // Try to save to database
          try {
            const orderPayload = {
              ...pendingOrder,
              payment_status: "paid",
              payment_method: "card",
              viva_transaction_id: t,
              status: "pending",
            };

            console.log('Attempting to insert order to Supabase:', orderPayload);

            const data = await createOrder(orderPayload);

            console.log('Order successfully inserted to Supabase:', data);

            // Clear sessionStorage
            sessionStorage.removeItem("pendingOrder");

            // Use the pending order data for display (includes items, etc.)
            setOrder({ ...pendingOrder, id: data.id, order_number: data.order_number } as Order);
            setLoading(false);

            // Redirect to tracking page after successful order creation
            setTimeout(() => {
              router.push(`/track/${data.id}`);
            }, 3000);
            return;
          } catch (dbError) {
            console.error('Database error:', dbError);
            setError(`Σφάλμα βάσης δεδομένων: ${dbError instanceof Error ? dbError.message : 'Άγνωστο σφάλμα'}`);
            setLoading(false);
            return;
          }
        }

        // Handle regular order success (cash on delivery)
        if (!id) {
          console.log('No transaction ID or order ID provided');
          setLoading(false);
          return;
        }

        console.log('Fetching order by ID:', id);
        try {
          const data = await getOrderById(id);
          console.log('Order fetched:', data);
          setOrder((data as unknown as Order) ?? null);
        } catch (error) {
          console.error('Order fetch error:', error);
          setError('Δεν ήταν δυνατή η ανάκτηση της παραγγελίας.');
        }
        setLoading(false);
      } catch (e) {
        console.error("Order processing error:", e);
        setError(e instanceof Error ? e.message : "Κάτι πήγε στραβά. Δοκίμασε ξανά.");
        setLoading(false);
      }
    }

    processOrder();
  }, [id, t]);

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />
      <main className="relative z-10 mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-3xl glass p-8 text-center animate-fade-up">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary shadow-[var(--shadow-glow)]">
            <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold text-white">Ευχαριστούμε!</h1>
          <p className="mt-2 text-white/70">
            Η παραγγελία σου καταχωρήθηκε και ετοιμάζεται.
          </p>

          {loading ? (
            <p className="mt-6 text-sm text-white/50">Φόρτωση...</p>
          ) : error ? (
            <p className="mt-6 text-sm text-destructive">{error}</p>
          ) : order ? (
            <>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                <span className="text-white/60">Αρ. παραγγελίας:</span>
                <span className="font-bold text-white">{order.order_number}</span>
              </div>

              <div className="mt-6 grid gap-3 text-left">
                <InfoRow icon={<Clock className="h-4 w-4" />} label="Εκτιμώμενος χρόνος" value="20–35 λεπτά" />
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Παράδοση" value={order.address} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Τηλέφωνο" value={order.customer_phone} />
              </div>

              <div className="mt-6 rounded-2xl bg-white/5 p-4 text-left">
                <h2 className="text-xs uppercase tracking-wider text-white/60">Προϊόντα</h2>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {order.items.map((it) => (
                    <li key={it.name} className="flex justify-between text-white/85">
                      <span>{it.qty}× {it.name}</span>
                      <span>{formatEur(it.qty * it.price)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm">
                  <div className="flex justify-between text-white/65"><span>Υποσύνολο</span><span>{formatEur(order.subtotal)}</span></div>
                  <div className="flex justify-between text-white/65"><span>Μεταφορικά</span><span>{order.delivery_fee === 0 ? "Δωρεάν" : formatEur(order.delivery_fee)}</span></div>
                  <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white"><span>Σύνολο</span><span>{formatEur(order.total)}</span></div>
                </div>
                <p className="mt-3 text-xs text-white/55">
                  Πληρωμή: {order.payment_method === "card" ? "Κάρτα — Πληρώθηκε" : "Μετρητά στην παράδοση"}
                </p>
              </div>
            </>
          ) : (
            <p className="mt-6 text-sm text-destructive">Δεν βρέθηκε η παραγγελία.</p>
          )}

          {/* Registration prompt for guest users */}
          {!isAuthenticated && order && (
            <div className="mt-8 rounded-2xl bg-white/5 p-6 text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Δημιουργήστε λογαριασμό</h3>
                  <p className="text-xs text-white/60">Αποθηκεύστε τις παραγγελίες σας και παραγγείνετε γρηγορότερα</p>
                </div>
              </div>
              <div className="space-y-3">
                <GoogleButton />
                <Link
                  href="/register"
                  className="block w-full text-center rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Δημιουργία λογαριασμού με email
                </Link>
                <Link
                  href="/"
                  className="block text-center text-xs text-white/50 hover:text-white/70 transition-colors"
                >
                  Συνέχεια χωρίς λογαριασμό
                </Link>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              <Home className="h-4 w-4" /> Αρχική
            </Link>
            {order && (
              <Link
                href={`/track/${order.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
              >
                <MapPin className="h-4 w-4" /> Παρακολούθηση Παράδοσης
              </Link>
            )}
            <Link
              href="/review"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Άσε αξιολόγηση
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-white/55">{label}</p>
        <p className="truncate text-sm text-white">{value}</p>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="relative min-h-screen text-foreground"><EspressoBackground /><main className="relative z-10 mx-auto max-w-2xl px-4 py-12"><div className="rounded-3xl glass p-8 text-center"><p className="text-white/50">Φόρτωση...</p></div></main></div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
