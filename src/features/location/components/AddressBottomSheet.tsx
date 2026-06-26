"use client";

import type { ReactNode } from "react";
import { Loader2, MapPin, XCircle } from "lucide-react";
import type { CheckoutAddress, DeliveryZoneResult } from "../types/address";
import { formatAddressArea, formatAddressLine } from "../utils/address-formatter";
import { ConfirmAddressButton } from "./ConfirmAddressButton";

type AddressBottomSheetProps = {
  search: ReactNode;
  address: CheckoutAddress | null;
  reverseLoading: boolean;
  reverseError: string | null;
  streetNumber: string;
  onStreetNumberChange: (streetNumber: string) => void;
  manualPinConfirmed: boolean;
  onManualPinConfirmedChange: (confirmed: boolean) => void;
  zoneResult: DeliveryZoneResult | null;
  zoneLoading: boolean;
  canConfirm: boolean;
  onConfirm: () => void;
};

export function AddressBottomSheet({
  search,
  address,
  reverseLoading,
  reverseError,
  streetNumber,
  onStreetNumberChange,
  manualPinConfirmed,
  onManualPinConfirmedChange,
  zoneResult,
  zoneLoading,
  canConfirm,
  onConfirm,
}: AddressBottomSheetProps) {
  const missingStreetNumber = !!address && !streetNumber.trim();

  return (
    <div className="relative z-30 border-t border-white/10 bg-black/75 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:h-full lg:border-l lg:border-t-0 lg:p-4">
      <div className="mx-auto flex max-h-[56svh] max-w-2xl flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-3 shadow-2xl lg:h-full lg:max-h-none lg:max-w-none lg:p-4">
        <div className="shrink-0">{search}</div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-red-500/15 text-red-300">
              {reverseLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MapPin className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-white/45">Διεύθυνση παράδοσης</p>
              {address ? (
                <>
                  <p className="truncate text-base font-semibold text-white">
                    {formatAddressLine(address)}
                  </p>
                  <p className="truncate text-sm text-white/60">
                    {formatAddressArea(address) || address.formattedAddress}
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/55">Μετακίνησε τον χάρτη ή γράψε διεύθυνση.</p>
              )}
            </div>
          </div>

          {reverseError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              <XCircle className="h-4 w-4" />
              Δεν μπορέσαμε να διαβάσουμε τη διεύθυνση.
            </div>
          )}

          {zoneResult && (
            <div
              className={`rounded-xl px-3 py-2 text-sm ${
                zoneResult.isAvailable
                  ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                  : "border border-red-400/20 bg-red-500/10 text-red-200"
              }`}
            >
              {zoneResult.message}
            </div>
          )}

          {missingStreetNumber && (
            <div className="space-y-3 rounded-xl border border-amber-300/25 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
              <p className="font-medium">Δεν εντοπίσαμε αριθμό οδού.</p>
              <p className="text-xs text-amber-100/80">
                Η παράδοση μπορεί να καθυστερήσει. Συμπλήρωσε αριθμό ή επιβεβαίωσε ότι η καρφίτσα
                στον χάρτη είναι ακριβής.
              </p>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-amber-50">Αριθμός οδού</span>
                <input
                  value={streetNumber}
                  onChange={(event) => onStreetNumberChange(event.target.value)}
                  placeholder="Π.χ. 12"
                  inputMode="numeric"
                  className="h-12 w-full rounded-xl border border-amber-200/30 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-primary"
                />
              </label>
              <label className="flex min-h-11 items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <input
                  type="checkbox"
                  checked={manualPinConfirmed}
                  onChange={(event) => onManualPinConfirmedChange(event.target.checked)}
                  className="mt-1 h-5 w-5"
                />
                <span className="text-xs text-amber-50">
                  Επιβεβαιώνω ότι η τοποθεσία στον χάρτη είναι ακριβής.
                </span>
              </label>
            </div>
          )}

          <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/55">
            Τον όροφο, το κουδούνι και τις οδηγίες παράδοσης θα τα συμπληρώσεις στο επόμενο βήμα.
          </p>
        </div>

        <ConfirmAddressButton disabled={!canConfirm} loading={zoneLoading} onConfirm={onConfirm} />
      </div>
    </div>
  );
}
