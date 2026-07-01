"use client";

import { X } from "lucide-react";

type DriverCreateModalProps = {
  open: boolean;
  fullName: string;
  password: string;
  submitting?: boolean;
  onFullNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function DriverCreateModal({
  open,
  fullName,
  password,
  submitting = false,
  onFullNameChange,
  onPasswordChange,
  onClose,
  onSubmit,
}: DriverCreateModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/90 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Νέος οδηγός</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">Όνομα *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => onFullNameChange(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/50 focus:border-primary focus:outline-none"
              placeholder="π.χ. Γιάννης Π."
              autoComplete="off"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">Κωδικός *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/50 focus:border-primary focus:outline-none"
              placeholder="Κωδικός σύνδεσης"
              autoComplete="new-password"
            />
            <p className="mt-2 text-xs text-white/45">
              Το username δημιουργείται αυτόματα. Ο οδηγός συνδέεται αμέσως στο /driver/login.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              Ακύρωση
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="flex-1 rounded-lg bg-primary px-4 py-2 font-semibold text-white shadow-[var(--shadow-glow)] transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Δημιουργία..." : "Δημιουργία"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
