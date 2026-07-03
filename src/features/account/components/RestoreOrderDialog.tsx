"use client";

import type { OrderLineValidationIssue } from "../types/order-restore.types";

type RestoreOrderDialogProps = {
  open: boolean;
  issues: OrderLineValidationIssue[];
  onContinue: () => void;
  onCancel: () => void;
  loading?: boolean;
};

function issueMessage(issue: OrderLineValidationIssue): string {
  const prefix =
    issue.reason === "unavailable"
      ? "Το προϊόν δεν είναι διαθέσιμο"
      : "Το προϊόν δεν είναι πλέον διαθέσιμο";
  return `${prefix}: ${issue.qty}× ${issue.name}`;
}

export function RestoreOrderDialog({
  open,
  issues,
  onContinue,
  onCancel,
  loading = false,
}: RestoreOrderDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-order-dialog-title"
      >
        <h2 id="restore-order-dialog-title" className="text-lg font-semibold text-white">
          Κάποια προϊόντα λείπουν
        </h2>
        <p className="mt-2 text-sm text-white/65">
          Τα παρακάτω προϊόντα δεν μπορούν να προστεθούν στο καλάθι:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-red-200">
          {issues.map((issue) => (
            <li
              key={`${issue.name}-${issue.reason}`}
              className="rounded-lg bg-red-500/10 px-3 py-2"
            >
              {issueMessage(issue)}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-white/55">Θέλετε να συνεχίσετε χωρίς αυτά;</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
          >
            Ακύρωση
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={loading}
            className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
          >
            Συνέχεια χωρίς αυτά
          </button>
        </div>
      </div>
    </div>
  );
}

export function PriceUpdatedNotice({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-[90] w-[min(100%-2rem,24rem)] -translate-x-1/2 rounded-xl border border-primary/30 bg-zinc-900 px-4 py-3 text-sm text-white shadow-lg">
      <p>Η τιμή ενημερώθηκε σύμφωνα με τον τρέχοντα κατάλογο.</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 text-xs font-semibold text-primary hover:underline"
      >
        Εντάξει
      </button>
    </div>
  );
}
