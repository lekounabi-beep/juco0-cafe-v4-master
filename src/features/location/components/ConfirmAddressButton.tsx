'use client';

import { Check, Loader2 } from 'lucide-react';

type ConfirmAddressButtonProps = {
  disabled: boolean;
  loading: boolean;
  onConfirm: () => void;
};

export function ConfirmAddressButton({ disabled, loading, onConfirm }: ConfirmAddressButtonProps) {
  return (
    <button
      type="button"
      onClick={onConfirm}
      disabled={disabled || loading}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
      {loading ? 'Έλεγχος διεύθυνσης...' : 'Επιβεβαίωση διεύθυνσης'}
    </button>
  );
}
