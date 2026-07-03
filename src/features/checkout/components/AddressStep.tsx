import { CheckCircle2, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCheckoutForm } from "../hooks/useCheckoutForm";
import { formatAddressArea, formatAddressLine } from "@/features/location/utils/address-formatter";
import type { RefObject } from "react";

type AddressStepProps = {
  onOpenAddressPicker: () => void;
  error?: string;
  actionRef?: RefObject<HTMLButtonElement | null>;
};

export function AddressStep({ onOpenAddressPicker, error, actionRef }: AddressStepProps) {
  const { deliveryAddress } = useCheckoutForm();
  const area = formatAddressArea(deliveryAddress);
  const zoneAvailable = deliveryAddress?.deliveryZone?.isAvailable === true;
  const zoneUnavailable = deliveryAddress?.deliveryZone?.isAvailable === false;
  const hasNumber = !!deliveryAddress?.number?.trim();
  const preferences = deliveryAddress?.deliveryPreferences?.join(" · ") ?? "";

  return (
    <section className="space-y-3 rounded-3xl glass p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-white/50">Βήμα 3</p>
        <h2 className="text-lg font-semibold text-white">Διεύθυνση παράδοσης</h2>
        <p className="mt-1 text-sm text-white/55">
          Βρες τη διεύθυνση και επιβεβαίωσε την καρφίτσα στον χάρτη.
        </p>
      </div>

      {deliveryAddress ? (
        <div
          className={`rounded-2xl border p-4 ${error ? "border-destructive/60 bg-destructive/10" : "border-emerald-400/25 bg-emerald-500/10"}`}
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-white">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">
                  {formatAddressLine(deliveryAddress)}
                </p>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
              </div>
              <p className="truncate text-xs text-white/60">
                {area || deliveryAddress.formattedAddress}
              </p>
              <div className="mt-2 space-y-1 text-xs">
                <p className={hasNumber ? "text-white/65" : "text-amber-200"}>
                  Αριθμός οδού: {hasNumber ? deliveryAddress.number : "Δεν εντοπίστηκε"}
                </p>
                {deliveryAddress?.floor && (
                  <p className="text-white/65">Όροφος: {deliveryAddress.floor}</p>
                )}
                {deliveryAddress?.bell && (
                  <p className="text-white/65">Κουδούνι: {deliveryAddress.bell}</p>
                )}
                {preferences && <p className="text-white/65">Παράδοση: {preferences}</p>}
                {deliveryAddress?.notes && (
                  <p className="line-clamp-2 text-white/65">Οδηγίες: {deliveryAddress.notes}</p>
                )}
                {!hasNumber && deliveryAddress.manualPinConfirmed && (
                  <p className="text-amber-100">
                    Έχεις επιβεβαιώσει ότι η καρφίτσα στον χάρτη είναι ακριβής.
                  </p>
                )}
                {zoneAvailable && <p className="text-emerald-200">✓ Η περιοχή εξυπηρετείται</p>}
                {zoneUnavailable && (
                  <p className="text-destructive-foreground">
                    ✕ Η περιοχή βρίσκεται εκτός ζώνης διανομής
                  </p>
                )}
              </div>
            </div>
            <button
              ref={actionRef}
              type="button"
              onClick={onOpenAddressPicker}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15"
              aria-label="Επεξεργασία διεύθυνσης"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <Button
          ref={actionRef}
          type="button"
          onClick={onOpenAddressPicker}
          className="h-14 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          <MapPin className="mr-2 h-5 w-5" />
          Προσθήκη διεύθυνσης παράδοσης
        </Button>
      )}

      {error && <p className="text-xs text-destructive-foreground">{error}</p>}
    </section>
  );
}
