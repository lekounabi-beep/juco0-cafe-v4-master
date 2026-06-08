"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ShoppingBag,
  MapPin,
  CreditCard,
  Plus,
  Minus,
  Trash2,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Banknote,
  Smartphone,
  Locate,
} from "lucide-react";
import { useCart, calcDeliveryFee, formatEur, FREE_DELIVERY_THRESHOLD } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { EspressoBackground } from "@/components/EspressoBackground";
import { createVivaOrderCode, redirectToVivaPayment } from "@/services/paymentService";

type Step = 1 | 2 | 3;
type PaymentMethod = "cod" | "card";

function CheckoutPage() {
  const router = useRouter();
  const items = useCart((s: any) => s.items);
  const add = useCart((s: any) => s.add);
  const setQty = useCart((s: any) => s.setQty);
  const remove = useCart((s: any) => s.remove);
  const clear = useCart((s: any) => s.clear);

  const subtotal = items.reduce((sum: number, i: any) => sum + i.qty * i.price, 0);
  const deliveryFee = calcDeliveryFee(subtotal);
  const total = subtotal + deliveryFee;

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressNotes, setAddressNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0 && step !== 3) {
    return <EmptyCart />;
  }

  const canStep2 = items.length > 0;
  const canStep3 = name.trim().length >= 2 && /^[0-9+\s-]{8,}$/.test(phone.trim()) && address.trim().length >= 5;

  async function getLocation() {
    setLocError(null);
    if (!("geolocation" in navigator)) {
      setLocError("Η συσκευή σου δεν υποστηρίζει εντοπισμό τοποθεσίας.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocError(err.message || "Δεν μπορέσαμε να βρούμε την τοποθεσία σου.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submitOrder() {
    setSubmitting(true);
    setError(null);
    try {
      // For card payment, use Viva Wallet Native Smart Checkout
      if (payment === "card") {
        // Create Viva Wallet order code with timeout
        const vivaResponse = await Promise.race([
          createVivaOrderCode(total, {
            email: undefined,
            fullName: name.trim(),
            phone: phone.trim(),
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Viva Wallet API timeout")), 15000)
          )
        ]) as any;

        console.log('Viva Wallet response:', vivaResponse);

        if (!vivaResponse.orderCode) {
          throw new Error(vivaResponse.errorText || "Failed to create Viva Wallet order");
        }

        // Store order data in sessionStorage for retrieval after payment
        const orderPayload = {
          items: items.map((i: any) => ({ name: i.name, price: i.price, qty: i.qty, category: i.category })),
          subtotal,
          delivery_fee: deliveryFee,
          total,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          address: address.trim(),
          address_notes: addressNotes.trim() || null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          payment_method: payment,
          payment_status: "paid",
          notes: notes.trim() || null,
          status: "pending",
        };

        sessionStorage.setItem("pendingOrder", JSON.stringify(orderPayload));
        
        // Small delay to ensure sessionStorage is set before redirect
        setTimeout(() => {
          redirectToVivaPayment(vivaResponse.orderCode);
        }, 100);
        return;
      }

      // For cash on delivery, proceed with normal flow
      const payload = {
        items: items.map((i: any) => ({ name: i.name, price: i.price, qty: i.qty, category: i.category })),
        subtotal,
        delivery_fee: deliveryFee,
        total,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        address: address.trim(),
        address_notes: addressNotes.trim() || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        payment_method: payment,
        payment_status: "pending",
        notes: notes.trim() || null,
        status: "pending",
      };

      // Add timeout to Supabase insert
      const { data, error: insErr } = await Promise.race([
        supabase
          .from("orders")
          .insert(payload)
          .select("id, order_number")
          .single(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Database timeout - please check your connection")), 10000)
        )
      ]) as any;

      if (insErr) {
        console.error('Supabase insert error:', insErr);
        throw new Error(`Database error: ${insErr.message || 'Failed to save order'}`);
      }

      clear();
      router.push(`/order-success?id=${(data as { id: string }).id}`);
    } catch (e) {
      console.error('Order submission error:', e);
      const msg = e instanceof Error ? e.message : "Κάτι πήγε στραβά. Δοκίμασε ξανά.";
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen text-foreground">
      <EspressoBackground />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-lg font-semibold text-white">Ολοκλήρωση Παραγγελίας</h1>
        </div>
        <Stepper step={step} />
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-6">
        {step === 1 && (
          <section className="space-y-4 animate-fade-up">
            <h2 className="text-xl font-semibold text-white">Το καλάθι σου</h2>
            <ul className="space-y-2">
              {items.map((it: any) => (
                <li key={it.name} className="flex items-center gap-3 rounded-2xl glass p-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
                    {it.image ? (
                      <Image src={it.image} alt={it.name} width={56} height={56} className="h-full w-full object-contain p-1" />
                    ) : (
                      <ShoppingBag className="h-5 w-5 text-black/40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{it.name}</p>
                    <p className="text-xs text-white/60">{formatEur(it.price)}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
                    <button onClick={() => setQty(it.name, it.qty - 1)} className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Μείωση">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-white">{it.qty}</span>
                    <button onClick={() => add({ name: it.name, price: it.price, image: it.image, category: it.category })} className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Προσθήκη">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button onClick={() => remove(it.name)} className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:text-destructive" aria-label="Αφαίρεση">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>

            <Totals subtotal={subtotal} deliveryFee={deliveryFee} total={total} />
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4 animate-fade-up">
            <h2 className="text-xl font-semibold text-white">Στοιχεία παράδοσης</h2>

            <Field label="Ονοματεπώνυμο" value={name} onChange={setName} placeholder="Π.χ. Γιώργος Παπαδόπουλος" />
            <Field label="Τηλέφωνο" value={phone} onChange={setPhone} placeholder="69XXXXXXXX" type="tel" />
            <Field label="Διεύθυνση" value={address} onChange={setAddress} placeholder="Οδός, αριθμός, πόλη" />
            <Field label="Όροφος / Κουδούνι (προαιρετικό)" value={addressNotes} onChange={setAddressNotes} placeholder="Π.χ. 3ος όροφος, κουδούνι Παπαδόπουλος" />

            <div className="rounded-2xl glass p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Τοποθεσία GPS</p>
                  <p className="text-xs text-white/60">
                    {coords
                      ? `Καταγράφηκε: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                      : "Για ακριβέστερη παράδοση"}
                  </p>
                </div>
                <button
                  onClick={getLocation}
                  disabled={locating}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50"
                >
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
                  {coords ? "Ξανά" : "Εντοπισμός"}
                </button>
              </div>
              {locError && <p className="mt-2 text-xs text-destructive">{locError}</p>}
              {coords && (
                <a
                  href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <MapPin className="h-3 w-3" /> Προβολή στον χάρτη
                </a>
              )}
            </div>

            <Field label="Σχόλια παραγγελίας (προαιρετικό)" value={notes} onChange={setNotes} placeholder="Π.χ. χωρίς ζάχαρη" textarea />
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4 animate-fade-up">
            <h2 className="text-xl font-semibold text-white">Τρόπος πληρωμής</h2>

            <div className="grid gap-3">
              <PayOption
                active={payment === "card"}
                onClick={() => setPayment("card")}
                icon={<Smartphone className="h-5 w-5" />}
                title="Κάρτα / Apple Pay / Google Pay"
                subtitle="Ασφαλής πληρωμή (demo)"
                badge="DEMO"
              />
              <PayOption
                active={payment === "cod"}
                onClick={() => setPayment("cod")}
                icon={<Banknote className="h-5 w-5" />}
                title="Μετρητά στην παράδοση"
                subtitle="Πληρώνεις τον διανομέα"
              />
            </div>

            <div className="rounded-2xl glass p-4">
              <h3 className="text-sm font-semibold text-white">Σύνοψη</h3>
              <Totals subtotal={subtotal} deliveryFee={deliveryFee} total={total} compact />
              <div className="mt-3 space-y-1 text-xs text-white/65">
                <p><strong className="text-white/85">Παραλήπτης:</strong> {name}</p>
                <p><strong className="text-white/85">Τηλέφωνο:</strong> {phone}</p>
                <p><strong className="text-white/85">Διεύθυνση:</strong> {address}{addressNotes ? `, ${addressNotes}` : ""}</p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                {error}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
              disabled={submitting}
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
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={(step === 1 && !canStep2) || (step === 2 && !canStep3)}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Συνέχεια
            </button>
          ) : (
            <button
              onClick={submitOrder}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {submitting ? "Επεξεργασία..." : payment === "card" ? "Πληρωμή & Αποστολή" : "Αποστολή"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "Καλάθι", Icon: ShoppingBag },
    { n: 2, label: "Παράδοση", Icon: MapPin },
    { n: 3, label: "Πληρωμή", Icon: CreditCard },
  ] as const;
  return (
    <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pb-3">
      {steps.map(({ n, label, Icon }, i) => {
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/60">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={200}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      )}
    </label>
  );
}

function PayOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
        active ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-white/15 bg-white/5 hover:border-white/30"
      }`}
    >
      <div className={`grid h-10 w-10 place-items-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white">{title}</p>
          {badge && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white/85">{badge}</span>}
        </div>
        <p className="text-xs text-white/60">{subtitle}</p>
      </div>
      <div className={`h-5 w-5 rounded-full border-2 ${active ? "border-primary bg-primary" : "border-white/30"}`} />
    </button>
  );
}

function Totals({ subtotal, deliveryFee, total, compact }: { subtotal: number; deliveryFee: number; total: number; compact?: boolean }) {
  const remainingForFree = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  return (
    <div className={`rounded-2xl ${compact ? "" : "glass p-4"} space-y-1.5 text-sm`}>
      <Row label="Μερικό σύνολο" value={formatEur(subtotal)} />
      <Row
        label="Μεταφορικά"
        value={deliveryFee === 0 ? "Δωρεάν" : formatEur(deliveryFee)}
        accent={deliveryFee === 0}
      />
      {!compact && remainingForFree > 0 && (
        <p className="pt-1 text-xs text-white/55">
          Πρόσθεσε άλλα {formatEur(remainingForFree)} για δωρεάν παράδοση.
        </p>
      )}
      <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
        <span className="text-sm font-semibold text-white">Σύνολο</span>
        <span className="text-lg font-bold text-white">{formatEur(total)}</span>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const className = accent ? "font-semibold text-primary" : "text-white";
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/70">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="relative grid min-h-screen place-items-center px-4 text-foreground">
      <EspressoBackground />
      <div className="relative z-10 max-w-md rounded-3xl glass p-8 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-white/50" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-white">Το καλάθι σου είναι άδειο</h1>
        <p className="mt-2 text-sm text-white/65">Πρόσθεσε προϊόντα από το μενού για να συνεχίσεις.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          Δες το μενού
        </Link>
      </div>
    </div>
  );
}

export default CheckoutPage;
