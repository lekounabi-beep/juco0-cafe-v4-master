"use client";

import Link from "next/link";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Home, MapPin, Phone, Heart, XCircle } from "lucide-react";
import { EspressoBackground } from "@/components/EspressoBackground";
import { formatEur } from "@/shared/utils/currency";
import { finalizeCardPaymentReturnAction } from "../actions/complete-viva-order";
import { getOrderById } from "@/integrations/supabase/services/order.service";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { GoogleButton } from "@/features/auth/components/GoogleButton";
import { useCart } from "@/lib/cart-store";
import { useSearchParams } from "next/navigation";

const CHECKOUT_TOKEN_KEY = "checkoutToken";
const CHECKOUT_TOKEN_BACKUP_KEY = "juco_checkout_token";
const CARD_ORDER_ID_KEY = "juco_card_order_id";
const POLL_ATTEMPTS = 24;
const POLL_MS = 500;

const VIVA_EVENT_MESSAGES: Record<string, string> = {
  "2061":
    "Η πιστοποίηση 3D Secure δεν ολοκληρώθηκε. Μείνετε στη σελίδα μέχρι να τελειώσει η πληρωμή και δοκιμάστε ξανά.",
  "2062": "Η πιστοποίηση 3D Secure απέτυχε. Ελέγξτε τον κωδικό και δοκιμάστε ξανά.",
};

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

function readCheckoutToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem(CHECKOUT_TOKEN_KEY) || localStorage.getItem(CHECKOUT_TOKEN_BACKUP_KEY)
  );
}

function readStoredOrderId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CARD_ORDER_ID_KEY);
}

function clearCheckoutTokens(): void {
  sessionStorage.removeItem(CHECKOUT_TOKEN_KEY);
  sessionStorage.removeItem("pendingOrder");
  localStorage.removeItem(CHECKOUT_TOKEN_BACKUP_KEY);
  localStorage.removeItem(CARD_ORDER_ID_KEY);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function vivaFailureMessage(eventId: string | undefined): string {
  if (eventId && VIVA_EVENT_MESSAGES[eventId]) {
    return VIVA_EVENT_MESSAGES[eventId];
  }
  if (eventId) {
    return `Η πληρωμή δεν ολοκληρώθηκε (κωδικός Viva: ${eventId}). Δοκιμάστε ξανά ή επιλέξτε μετρητά στην παράδοση.`;
  }
  return "Η πληρωμή δεν ολοκληρώθηκε. Δοκιμάστε ξανά ή επιλέξτε μετρητά στην παράδοση.";
}

function redirectToTrack(orderId: string, clearCart: () => void) {
  clearCheckoutTokens();
  clearCart();
  window.location.replace(`/track/${orderId}`);
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id") || undefined;
  const t = searchParams.get("t") || undefined;
  const s = searchParams.get("s") || undefined;
  const eventId = searchParams.get("eventId") || undefined;
  const { isAuthenticated } = useAuth();
  const clearCart = useCart((s) => s.clear);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    async function processOrder() {
      const isCardReturn = Boolean(t || s || eventId);

      if (isCardReturn) {
        const checkoutToken = readCheckoutToken();
        const storedOrderId = readStoredOrderId();

        for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
          const result = await finalizeCardPaymentReturnAction({
            transactionId: t ?? null,
            vivaOrderCode: s ?? null,
            orderId: storedOrderId,
            checkoutToken,
            eventId: eventId ?? null,
          });

          if (result.status === "track") {
            redirectToTrack(result.order.id, clearCart);
            return;
          }

          if (result.status === "checkout") {
            clearCheckoutTokens();
            router.replace(
              eventId
                ? `/checkout?eventId=${encodeURIComponent(eventId)}${s ? `&s=${encodeURIComponent(s)}` : ""}`
                : "/checkout",
            );
            return;
          }

          if (result.status === "error") {
            setError(eventId ? vivaFailureMessage(eventId) : result.message);
            setLoading(false);
            return;
          }

          if (result.status === "pending" && attempt < POLL_ATTEMPTS - 1) {
            await sleep(POLL_MS);
            continue;
          }

          if (result.status === "pending") {
            setError(
              "Η πληρωμή μπορεί να έχει ολοκληρωθεί, αλλά δεν μπορέσαμε να την επιβεβαιώσουμε ακόμα. Δοκιμάστε να ανανεώσετε τη σελίδα.",
            );
            setLoading(false);
            return;
          }
        }

        return;
      }

      if (!id) {
        setError(
          "Δεν ολοκληρώθηκε παραγγελία. Αν προσπάθησες να πληρώσεις με κάρτα, δεν έχει επιβεβαιωθεί πληρωμή.",
        );
        setLoading(false);
        return;
      }

      try {
        const data = await getOrderById(id);
        setOrder((data as unknown as Order) ?? null);
      } catch {
        setError("Δεν ήταν δυνατή η ανάκτηση της παραγγελίας.");
      }
      setLoading(false);
    }

    void processOrder();
  }, [clearCart, eventId, id, router, s, t]);

  const isSuccess = !!order && !error;
  const heading = loading
    ? "Έλεγχος παραγγελίας"
    : isSuccess
      ? "Ευχαριστούμε!"
      : "Δεν ολοκληρώθηκε η παραγγελία";
  const summary = loading
    ? "Επιβεβαιώνουμε την κατάσταση της παραγγελίας."
    : isSuccess
      ? "Η παραγγελία σου καταχωρήθηκε και ετοιμάζεται."
      : "Δεν έχουμε επιβεβαιωμένη παραγγελία για αυτή την πληρωμή.";
  const fulfillmentLabel = order?.address === "Παραλαβή από το μαγαζί" ? "Παραλαβή" : "Παράδοση";

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />
      <main className="relative z-10 mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-3xl glass p-8 text-center animate-fade-up">
          <div
            className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${
              loading
                ? "bg-white/10"
                : isSuccess
                  ? "bg-primary shadow-[var(--shadow-glow)]"
                  : "bg-destructive/20"
            }`}
          >
            {loading ? (
              <Clock className="h-8 w-8 text-white/70" />
            ) : isSuccess ? (
              <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
            ) : (
              <XCircle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold text-white">{heading}</h1>
          <p className="mt-2 text-white/70">{summary}</p>

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
                <InfoRow
                  icon={<Clock className="h-4 w-4" />}
                  label="Εκτιμώμενος χρόνος"
                  value="20–35 λεπτά"
                />
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  label={fulfillmentLabel}
                  value={order.address}
                />
                <InfoRow
                  icon={<Phone className="h-4 w-4" />}
                  label="Τηλέφωνο"
                  value={order.customer_phone}
                />
              </div>

              <div className="mt-6 rounded-2xl bg-white/5 p-4 text-left">
                <h2 className="text-xs uppercase tracking-wider text-white/60">Προϊόντα</h2>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {order.items.map((it) => (
                    <li key={it.name} className="flex justify-between text-white/85">
                      <span>
                        {it.qty}× {it.name}
                      </span>
                      <span>{formatEur(it.qty * it.price)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm">
                  <div className="flex justify-between text-white/65">
                    <span>Υποσύνολο</span>
                    <span>{formatEur(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-white/65">
                    <span>Μεταφορικά</span>
                    <span>
                      {order.delivery_fee === 0 ? "Δωρεάν" : formatEur(order.delivery_fee)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
                    <span>Σύνολο</span>
                    <span>{formatEur(order.total)}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-white/55">
                  Πληρωμή:{" "}
                  {order.payment_method === "card" ? "Κάρτα — Πληρώθηκε" : "Μετρητά στην παράδοση"}
                </p>
              </div>
            </>
          ) : (
            <p className="mt-6 text-sm text-destructive">Δεν βρέθηκε η παραγγελία.</p>
          )}

          {!isAuthenticated && order && (
            <div className="mt-8 rounded-2xl bg-white/5 p-6 text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Δημιουργήστε λογαριασμό</h3>
                  <p className="text-xs text-white/60">
                    Αποθηκεύστε τις παραγγελίες σας και παραγγείνετε γρηγορότερα
                  </p>
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

          {!loading && error && (
            <Link
              href="/checkout"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Επιστροφή στο checkout
            </Link>
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
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-white/55">{label}</p>
        <p className="truncate text-sm text-white">{value}</p>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen text-foreground">
          <EspressoBackground />
          <main className="relative z-10 mx-auto max-w-2xl px-4 py-12">
            <div className="rounded-3xl glass p-8 text-center">
              <p className="text-white/50">Φόρτωση...</p>
            </div>
          </main>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
