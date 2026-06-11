"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import React from "react";
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
import { EspressoBackground } from "@/components/EspressoBackground";
import { productImages } from "@/data/productImages";
import { useCheckoutLogic } from "@/hooks/useCheckoutLogic";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { useLocation } from "@/hooks/useLocation";
import { formatEur, FREE_DELIVERY_THRESHOLD } from "@/lib/cart-store";

type Step = 1 | 2 | 3;

function CheckoutPage() {
  const addressInputRef = useRef<HTMLInputElement>(null);
  
  // Use custom hooks
  const checkoutLogic = useCheckoutLogic();
  const googleMaps = useGoogleMaps(addressInputRef);
  const location = useLocation();

  const {
    items,
    add,
    setQty,
    remove,
    subtotal,
    deliveryFee,
    total,
    step,
    setStep,
    name,
    setName,
    phone,
    setPhone,
    address,
    setAddress,
    addressNotes,
    setAddressNotes,
    notes,
    setNotes,
    coords,
    setCoords,
    payment,
    setPayment,
    submitting,
    error,
    canStep2,
    canStep3,
    submitOrder,
  } = checkoutLogic;

  const { mapRef, mapCenter, setMapCenter, panToLocation } = googleMaps;
  const { locating, locError, getLocation } = location;

  // Handle custom events from hooks
  useEffect(() => {
    const handleAddressSelected = (e: CustomEvent) => {
      const { address: selectedAddress, coords: selectedCoords } = e.detail;
      setAddress(selectedAddress);
      if (selectedCoords) {
        setCoords(selectedCoords);
        setMapCenter(selectedCoords);
      }
    };

    const handleMapMoved = (e: CustomEvent) => {
      const { coords: newCoords } = e.detail;
      setCoords(newCoords);
    };

    const handleAddressFromMap = (e: CustomEvent) => {
      const { address: newAddress } = e.detail;
      setAddress(newAddress);
    };

    const handleAddressFromLocation = (e: CustomEvent) => {
      const { address: newAddress, coords: newCoords } = e.detail;
      setAddress(newAddress);
      setCoords(newCoords);
      setMapCenter(newCoords);
      panToLocation(newCoords.lat, newCoords.lng);
    };

    window.addEventListener('addressSelected', handleAddressSelected as EventListener);
    window.addEventListener('mapMoved', handleMapMoved as EventListener);
    window.addEventListener('addressFromMap', handleAddressFromMap as EventListener);
    window.addEventListener('addressFromLocation', handleAddressFromLocation as EventListener);

    return () => {
      window.removeEventListener('addressSelected', handleAddressSelected as EventListener);
      window.removeEventListener('mapMoved', handleMapMoved as EventListener);
      window.removeEventListener('addressFromMap', handleAddressFromMap as EventListener);
      window.removeEventListener('addressFromLocation', handleAddressFromLocation as EventListener);
    };
  }, [setAddress, setCoords, setMapCenter, panToLocation]);

  // Handle location button click
  const handleGetLocation = () => {
    getLocation((coords: { lat: number; lng: number }) => {
      setCoords(coords);
      setMapCenter(coords);
      panToLocation(coords.lat, coords.lng);
    });
  };

  if (items.length === 0 && step !== 3) {
    return <EmptyCart />;
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
              {items.map((it: any) => {
                const productImage = productImages[it.name] || it.image;
                return (
                  <li key={it.name} className="flex items-center gap-3 rounded-2xl glass p-3">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10">
                      {productImage ? (
                        <Image src={productImage} alt={it.name} width={128} height={128} className="h-full w-full object-cover" quality={90} />
                      ) : (
                        <ShoppingBag className="h-5 w-5 text-white/40" />
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
                      <button onClick={() => add({ name: it.name, price: it.price, image: productImage, category: it.category })} className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Προσθήκη">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button onClick={() => remove(it.name)} className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:text-destructive" aria-label="Αφαίρεση">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>

            <Totals subtotal={subtotal} deliveryFee={deliveryFee} total={total} />
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4 animate-fade-up">
            <h2 className="text-xl font-semibold text-white">Στοιχεία παράδοσης</h2>

            <Field label="Ονοματεπώνυμο" value={name} onChange={setName} placeholder="Π.χ. Γιώργος Παπαδόπουλος" />
            <Field label="Τηλέφωνο" value={phone} onChange={setPhone} placeholder="69XXXXXXXX" type="tel" />
            <Field label="Διεύθυνση" value={address} onChange={setAddress} placeholder="Οδός, αριθμός, πόλη" ref={addressInputRef} />
            <Field label="Όροφος / Κουδούνι (προαιρετικό)" value={addressNotes} onChange={setAddressNotes} placeholder="Π.χ. 3ος όροφος, κουδούνι Παπαδόπουλος" />

            {/* Interactive Map */}
            <div className="relative h-64 w-full overflow-hidden rounded-2xl glass md:h-96">
              <div ref={mapRef} className="h-full w-full" />
              {/* Center Pin */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-primary shadow-[var(--shadow-glow)] animate-bounce" />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-4 w-0.5 bg-primary" />
                </div>
              </div>
              {/* Current Location Button */}
              <button
                onClick={handleGetLocation}
                disabled={locating}
                className="absolute bottom-4 right-4 z-20 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90 disabled:opacity-50"
                aria-label="Η τοποθεσία μου"
              >
                {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Locate className="h-5 w-5" />}
              </button>
            </div>

            {locError && <p className="text-xs text-destructive">{locError}</p>}

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

const Field = React.forwardRef<HTMLInputElement, {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}>(({ label, value, onChange, placeholder, type = "text", textarea = false }, ref) => {
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
          ref={ref}
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
});
Field.displayName = "Field";

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
        <p className="mt-2 text-sm text-white/65">Πρόσθετε προϊόντα από το μενού για να συνεχίσετε.</p>
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
