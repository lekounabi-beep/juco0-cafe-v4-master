"use client";

import { Check, Loader2 } from "lucide-react";

type ConfirmAddressButtonProps = {
  disabled: boolean;
  loading: boolean;
  onConfirm: () => void;
  label?: string;
  subtitle?: string | null;
  loadingLabel?: string;
  className?: string;
};

export function ConfirmAddressButton({
  disabled,
  loading,
  onConfirm,
  label = "Επιβεβαίωση διεύθυνσης",
  subtitle = "Θα χρησιμοποιηθεί η θέση της καρφίτσας.",
  loadingLabel = "Έλεγχος διεύθυνσης...",
  className = "",
}: ConfirmAddressButtonProps) {
  return (
    <button
      type="button"
      onClick={onConfirm}
      disabled={disabled || loading}
      className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.28)] active:scale-[0.985] motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <span className="flex flex-col items-center gap-0.5 leading-tight">
        <span className="flex items-center gap-2">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          {loading ? loadingLabel : label}
        </span>
        {!loading && !disabled && subtitle ? (
          <span className="text-[11px] font-medium text-primary-foreground/80">{subtitle}</span>
        ) : null}
      </span>
    </button>
  );
}
