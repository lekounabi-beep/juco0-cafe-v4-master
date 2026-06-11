"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import {
  LocateFixed,
  Loader2,
  MapPin,
  CreditCard,
  ReceiptText,
  Truck,
  Check,
  ShieldCheck,
} from "lucide-react"

export interface CheckoutUIProps {
  address: string
  setAddress: (val: string) => void
  lat: number
  lng: number
  subtotal: number
  deliveryFee: number
  total: number
  onSubmit: () => void
  isSubmitting: boolean
  /** Optional: signals the "Locate Me" action is in progress (pulses the button) */
  isLocating?: boolean
  /** Optional: handler for the "Locate Me" button */
  onLocate?: () => void
}

const STEPS = [
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "summary", label: "Summary", icon: ReceiptText },
] as const

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

/**
 * AnimatedPrice plays a subtle "pop" animation whenever its value changes.
 */
function AnimatedPrice({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const [popKey, setPopKey] = useState(0)
  const prev = useRef(value)

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value
      setPopKey((k) => k + 1)
    }
  }, [value])

  return (
    <span
      key={popKey}
      className={`inline-block tabular-nums animate-pop ${className ?? ""}`}
    >
      {formatCurrency(value)}
    </span>
  )
}

/**
 * FloatingInput is a modern label-floats-on-focus/value input.
 */
function FloatingInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  trailing,
  autoComplete,
  inputMode,
}: {
  id: string
  label: string
  value: string
  onChange?: (val: string) => void
  type?: string
  trailing?: React.ReactNode
  autoComplete?: string
  inputMode?: "text" | "numeric" | "tel" | "email"
}) {
  return (
    <div className="group relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder=" "
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="peer h-14 w-full rounded-xl border border-input bg-white/5 px-4 pt-4 pb-1 text-base text-foreground outline-none transition-colors placeholder:text-transparent focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground transition-all duration-200 peer-focus:top-3.5 peer-focus:text-xs peer-focus:font-medium peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-muted-foreground"
      >
        {label}
      </label>
      {trailing ? (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>
      ) : null}
    </div>
  )
}

export default function CheckoutUI({
  address,
  setAddress,
  lat,
  lng,
  subtotal,
  deliveryFee,
  total,
  onSubmit,
  isSubmitting,
  isLocating = false,
  onLocate,
}: CheckoutUIProps) {
  const [apartment, setApartment] = useState("")
  const [name, setName] = useState("")
  const [card, setCard] = useState("")

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <div className="min-h-dvh w-full text-foreground">
      <div className="flex min-h-dvh flex-col-reverse lg:flex-row">
        {/* FORM PANEL — 40% on desktop */}
        <div className="relative z-10 flex w-full flex-col lg:w-2/5 lg:max-w-[560px]">
          <div className="glass flex-1 overflow-y-auto px-5 pb-32 pt-8 sm:px-8 lg:pb-12">
            {/* Header */}
            <header className="animate-fade-up mb-8">
              <p className="text-xs font-medium uppercase tracking-wider text-primary">
                Almost there
              </p>
              <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-balance">
                Checkout
              </h1>
            </header>

            {/* Progress Stepper */}
            <Stepper className="animate-fade-up mb-8" />

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Delivery Section */}
              <section className="animate-fade-up space-y-4">
                <SectionTitle icon={MapPin} step={1} title="Delivery details" />

                <div className="relative">
                  <FloatingInput
                    id="address"
                    label="Delivery address"
                    value={address}
                    onChange={setAddress}
                    autoComplete="street-address"
                    trailing={
                      <button
                        type="button"
                        onClick={onLocate}
                        aria-label="Use my current location"
                        className={`relative flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors hover:bg-primary/25 ${
                          isLocating ? "animate-pulse" : ""
                        }`}
                      >
                        {isLocating ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <LocateFixed className="size-5" />
                        )}
                        {isLocating && (
                          <span className="absolute inset-0 animate-ping rounded-lg bg-primary/30" />
                        )}
                      </button>
                    }
                  />
                </div>

                <FloatingInput
                  id="apartment"
                  label="Apartment, suite, etc. (optional)"
                  value={apartment}
                  onChange={setApartment}
                />

                {/* Coordinate chip */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 text-primary" />
                  <span className="tabular-nums">
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                  </span>
                </div>
              </section>

              {/* Payment Section */}
              <section className="animate-fade-up space-y-4">
                <SectionTitle icon={CreditCard} step={2} title="Payment" />
                <FloatingInput
                  id="name"
                  label="Name on card"
                  value={name}
                  onChange={setName}
                  autoComplete="cc-name"
                />
                <FloatingInput
                  id="card"
                  label="Card number"
                  value={card}
                  onChange={setCard}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  trailing={<CreditCard className="mr-2 size-5 text-muted-foreground" />}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FloatingInput id="expiry" label="MM / YY" value="" inputMode="numeric" />
                  <FloatingInput id="cvc" label="CVC" value="" inputMode="numeric" />
                </div>
              </section>
            </form>
          </div>

          {/* Sticky mobile action bar */}
          <div className="glass-strong fixed inset-x-0 bottom-0 z-20 border-t border-border px-5 py-4 lg:hidden">
            <SubmitButton
              isSubmitting={isSubmitting}
              total={total}
              onClick={handleSubmit}
            />
          </div>
        </div>

        {/* MAP + SUMMARY PANEL — 60% on desktop */}
        <div className="relative w-full lg:w-3/5">
          {/* Map */}
          <div
            id="map"
            className="relative h-64 w-full overflow-hidden lg:h-dvh lg:sticky lg:top-0"
            role="img"
            aria-label="Map showing the delivery location"
          >
            {/* Decorative map grid fallback so the area is never blank */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(oklch(1 0 0 / 0.05) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.05) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            {/* Center pin */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
              <div className="relative flex flex-col items-center">
                <div className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
                  <MapPin className="size-6" />
                </div>
                <div className="-mt-1 size-3 rotate-45 bg-primary" />
              </div>
            </div>

            {/* Floating summary card — sticky/overlaid on the map */}
            <div className="absolute inset-x-4 bottom-4 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[360px]">
              <OrderSummary
                subtotal={subtotal}
                deliveryFee={deliveryFee}
                total={total}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stepper({ className }: { className?: string }) {
  // First step active for this presentational demo
  const activeIndex = 0
  return (
    <div className={className}>
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const isActive = i === activeIndex
          const isComplete = i < activeIndex
          const Icon = step.icon
          return (
            <div key={step.id} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex size-10 items-center justify-center rounded-full border transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-glow"
                      : isComplete
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {isComplete ? <Check className="size-5" /> : <Icon className="size-5" />}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 mb-6 h-px flex-1 ${
                    i < activeIndex ? "bg-primary/50" : "bg-border"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  step,
  title,
}: {
  icon: typeof MapPin
  step: number
  title: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Step {step}
        </p>
        <h2 className="font-heading text-lg font-semibold leading-none">{title}</h2>
      </div>
    </div>
  )
}

function OrderSummary({
  subtotal,
  deliveryFee,
  total,
  isSubmitting,
  onSubmit,
}: {
  subtotal: number
  deliveryFee: number
  total: number
  isSubmitting: boolean
  onSubmit: (e: FormEvent) => void
}) {
  return (
    <div className="glass-strong rounded-2xl p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold">Order summary</h3>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          Secure
        </span>
      </div>

      <dl className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium">
            <AnimatedPrice value={subtotal} />
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Delivery fee</dt>
          <dd className="font-medium">
            <AnimatedPrice value={deliveryFee} />
          </dd>
        </div>
      </dl>

      <div className="my-4 h-px bg-border" />

      <div className="mb-5 flex items-end justify-between">
        <span className="text-sm text-muted-foreground">Total</span>
        <AnimatedPrice
          value={total}
          className="font-heading text-2xl font-bold text-foreground"
        />
      </div>

      {/* Desktop submit lives inside the sticky summary */}
      <div className="hidden lg:block">
        <SubmitButton isSubmitting={isSubmitting} total={total} onClick={onSubmit} />
      </div>
    </div>
  )
}

function SubmitButton({
  isSubmitting,
  total,
  onClick,
}: {
  isSubmitting: boolean
  total: number
  onClick: (e: FormEvent) => void
}) {
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={isSubmitting}
      className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-glow transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80"
    >
      {isSubmitting ? (
        <>
          <Loader2 className="size-5 animate-spin" />
          Placing order…
        </>
      ) : (
        <>
          Place order
          <span className="tabular-nums">{formatCurrency(total)}</span>
        </>
      )}
    </button>
  )
}
