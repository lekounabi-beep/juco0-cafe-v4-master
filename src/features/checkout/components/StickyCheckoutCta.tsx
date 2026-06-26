import { CheckCircle2, Loader2 } from "lucide-react";
import { formatEur } from "@/shared/utils/currency";

type StickyCheckoutCtaProps = {
  total: number;
  submitting: boolean;
  payment: string;
  onSubmit: () => void;
};

export function StickyCheckoutCta({
  total,
  submitting,
  payment,
  onSubmit,
}: StickyCheckoutCtaProps) {
  const label = payment === "card" ? "Πληρωμή & παραγγελία" : "Υποβολή παραγγελίας";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/55">Σύνολο</p>
          <p className="text-lg font-bold text-white">{formatEur(total)}</p>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {submitting ? "Επεξεργασία..." : `${label} • ${formatEur(total)}`}
        </button>
      </div>
    </div>
  );
}
