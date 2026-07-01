"use client";

import { Check, Copy, X } from "lucide-react";
import { useState } from "react";

type DriverCredentialsModalProps = {
  open: boolean;
  fullName: string;
  username: string;
  onClose: () => void;
};

export function DriverCredentialsModal({
  open,
  fullName,
  username,
  onClose,
}: DriverCredentialsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText(username);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-emerald-500/25 bg-black/90 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Οδηγός έτοιμος</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-white/65">
          Ο/Η <span className="font-medium text-white">{fullName}</span> μπορεί να συνδεθεί στο{" "}
          <span className="text-white/80">/driver/login</span> με τα παρακάτω:
        </p>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-white/45">Username (ακριβώς έτσι)</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <code className="break-all text-base font-semibold text-emerald-200">{username}</code>
            <button
              type="button"
              onClick={() => void copyUsername()}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Αντιγράφηκε" : "Αντιγραφή"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-white/45">
          Ο κωδικός είναι αυτός που μόλις έβαλες στη δημιουργία. Αν ο οδηγός δεν μπορεί να μπει,
          χρησιμοποίησε «Επεξεργασία» για νέο κωδικό.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white"
        >
          Κλείσιμο
        </button>
      </div>
    </div>
  );
}
