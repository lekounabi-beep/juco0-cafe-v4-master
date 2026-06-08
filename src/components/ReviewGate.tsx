import { useState } from "react";
import { Star, MapPin, Send, CheckCircle2 } from "lucide-react";

type Phase = "rating" | "positive" | "negative" | "thanks";

const GOOGLE_MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Juco+Coffee+Juice+Bar+Nafpaktos";
const WOLT_URL = "https://wolt.com/en/grc/nafpaktos";

export function ReviewGate() {
  const [phase, setPhase] = useState<Phase>("rating");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");

  function pick(n: number) {
    setRating(n);
    setTimeout(() => setPhase(n >= 4 ? "positive" : "negative"), 220);
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-4">
      <div className="relative overflow-hidden rounded-3xl glass-strong p-6 sm:p-8 shadow-[var(--shadow-soft)]">
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        {phase === "rating" && (
          <div className="animate-fade-up text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your opinion matters</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold">Rate your experience</h2>
            <p className="mt-2 text-sm text-muted-foreground">Tap a star to let us know how we did.</p>
            <div className="mt-6 flex justify-center gap-2 sm:gap-3" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => pick(n)}
                    className="group p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`h-10 w-10 sm:h-12 sm:w-12 transition-all ${
                        active ? "fill-primary stroke-primary drop-shadow-[0_4px_12px_oklch(0.92_0.21_102_/_0.5)]" : "stroke-muted-foreground/40"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "positive" && (
          <div className="animate-fade-up text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary animate-pop">
              <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold">Amazing — thank you!</h3>
            <p className="mt-2 text-sm text-muted-foreground">Would you share your experience publicly?</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"
              >
                <MapPin className="h-4 w-4" /> Review on Google Maps
              </a>
              <a
                href={WOLT_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
              >
                <Star className="h-4 w-4 fill-current" /> Rate us on Wolt
              </a>
            </div>
          </div>
        )}

        {phase === "negative" && (
          <form
            className="animate-fade-up"
            onSubmit={(e) => {
              e.preventDefault();
              setPhase("thanks");
            }}
          >
            <h3 className="text-xl sm:text-2xl font-semibold">We are deeply sorry</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Please tell us what went wrong so our manager can fix it immediately.
            </p>
            <textarea
              required
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Tell us what happened…"
              className="mt-4 w-full resize-none rounded-xl border border-border bg-background p-4 text-sm outline-none transition focus:border-foreground"
            />
            <button
              type="submit"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"
            >
              <Send className="h-4 w-4" /> Submit feedback
            </button>
          </form>
        )}

        {phase === "thanks" && (
          <div className="animate-fade-up text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary animate-pop">
              <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold">Thank you</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your feedback was sent directly to our manager. We'll make it right.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
