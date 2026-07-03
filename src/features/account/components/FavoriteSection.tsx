"use client";

import { useEffect, useMemo, useState } from "react";
import { useFavoriteOrder } from "../hooks/useFavoriteOrder";
import { useRestoreOrder } from "../hooks/useRestoreOrder";
import {
  validateOrderLines,
  toOrderLineSnapshots,
} from "../services/order-line-validation.service";
import { RestoreOrderDialog, PriceUpdatedNotice } from "./RestoreOrderDialog";
import { formatEur } from "@/shared/utils/currency";
import { Coffee, Loader2, Pencil, ShoppingBag, Star, Trash2 } from "lucide-react";
import type { ValidatedOrderLine } from "../types/order-restore.types";

function formatRelativeUpdatedAt(updatedAt: string | null): string | null {
  if (!updatedAt) return null;

  const updated = new Date(updatedAt);
  const diffMs = Date.now() - updated.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Ενημερώθηκε σήμερα";
  if (diffDays === 1) return "Ενημερώθηκε πριν 1 ημέρα";
  return `Ενημερώθηκε πριν ${diffDays} ημέρες`;
}

export function FavoriteSection() {
  const { favorite, updatedAt, loading, error, remove } = useFavoriteOrder();
  const {
    restore,
    loading: restoreLoading,
    pending,
    priceNotice,
    confirmContinueWithoutIssues,
    cancelPending,
    dismissPriceNotice,
  } = useRestoreOrder();

  const [liveLines, setLiveLines] = useState<ValidatedOrderLine[] | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [editNotice, setEditNotice] = useState(false);

  useEffect(() => {
    if (!favorite?.length) {
      setLiveLines(null);
      setPricingLoading(false);
      return;
    }

    let cancelled = false;
    setPricingLoading(true);

    void validateOrderLines(toOrderLineSnapshots(favorite))
      .then((result) => {
        if (cancelled) return;
        setLiveLines(result.valid);
      })
      .catch(() => {
        if (cancelled) return;
        // Fall back to the stored snapshot so the card never gets stuck.
        setLiveLines(
          favorite.map((item) => ({
            name: item.name,
            price: item.price,
            qty: item.qty,
            category: item.category,
            image: item.image,
            priceChanged: false,
          })),
        );
      })
      .finally(() => {
        if (cancelled) return;
        setPricingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [favorite]);

  const displayLines = useMemo(() => liveLines ?? [], [liveLines]);
  const totalQty = useMemo(
    () => displayLines.reduce((sum, line) => sum + line.qty, 0),
    [displayLines],
  );
  const liveSubtotal = useMemo(
    () => displayLines.reduce((sum, line) => sum + line.qty * line.price, 0),
    [displayLines],
  );
  const relativeUpdated = formatRelativeUpdatedAt(updatedAt);

  const handleOrderNow = async () => {
    if (!favorite?.length) return;
    await restore(favorite, { redirectToCheckout: true });
  };

  const handleEdit = async () => {
    if (!favorite?.length) return;
    const result = await restore(favorite, { redirectToCheckout: false });
    if (result.success) {
      setEditNotice(true);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε τη συνήθη παραγγελία σας;")) {
      return;
    }
    await remove();
  };

  if (loading && !favorite) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Η Συνήθης Παραγγελία μου</h2>
          <p className="text-sm text-white/60">Γρήγορη παραγγελία με ένα πάτημα</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200">{error}</div>
        )}

        {editNotice && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-white/85">
            Αλλάξτε την παραγγελία και ολοκληρώστε checkout για να ενημερωθεί αυτόματα η συνήθης
            παραγγελία σας.
          </div>
        )}

        {!favorite ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center">
            <Star className="mx-auto mb-4 h-12 w-12 text-white/20" />
            <p className="text-white/70">Δεν έχετε ακόμη συνήθη παραγγελία.</p>
            <p className="mt-2 text-sm text-white/45">
              Η συνήθης παραγγελία δημιουργείται αυτόματα μετά από κάθε επιτυχημένη παραγγελία.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
                <Coffee className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">Η Συνήθης Παραγγελία μου</p>
                <p className="text-xs text-white/50">
                  {totalQty} προϊόν{totalQty === 1 ? "" : "τα"}
                  {relativeUpdated ? ` · ${relativeUpdated}` : ""}
                </p>
              </div>
            </div>

            <ul className="mb-4 space-y-1.5 text-sm text-white/85">
              {displayLines.map((line) => (
                <li key={line.name} className="flex justify-between gap-3">
                  <span>
                    {line.qty}× {line.name}
                  </span>
                  <span className="text-white/55">{formatEur(line.qty * line.price)}</span>
                </li>
              ))}
            </ul>

            <div className="mb-4 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-sm text-white/60">Σύνολο</span>
              <span className="text-lg font-semibold text-white">
                {pricingLoading ? "…" : formatEur(liveSubtotal)}
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleOrderNow}
                disabled={restoreLoading || pricingLoading || displayLines.length === 0}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {restoreLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingBag className="h-4 w-4" />
                )}
                <span>Παραγγελία</span>
              </button>
              <button
                type="button"
                onClick={handleEdit}
                disabled={restoreLoading || pricingLoading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" />
                <span>Επεξεργασία</span>
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                title="Διαγραφή"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sm:hidden">Διαγραφή</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <RestoreOrderDialog
        open={Boolean(pending)}
        issues={pending?.result.issues ?? []}
        onContinue={() => void confirmContinueWithoutIssues()}
        onCancel={cancelPending}
        loading={restoreLoading}
      />
      <PriceUpdatedNotice open={priceNotice} onDismiss={dismissPriceNotice} />
    </>
  );
}
