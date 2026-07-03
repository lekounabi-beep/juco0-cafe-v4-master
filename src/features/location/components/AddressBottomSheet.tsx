"use client";

import { ArrowLeft, Loader2, MapPin, XCircle } from "lucide-react";
import type { CheckoutAddress, DeliveryZoneResult } from "../types/address";
import { formatAddressArea, formatAddressLine } from "../utils/address-formatter";
import { ConfirmAddressButton } from "./ConfirmAddressButton";
import { MAX_DELIVERY_DISTANCE_KM } from "../services/delivery-zone";

const DELIVERY_PREFERENCES = [
  "Καλέστε με",
  "Αφήστε στην πόρτα",
  "Πλαϊνή είσοδος",
  "Δεν λειτουργεί το κουδούνι",
] as const;

type AddressBottomSheetProps = {
  address: CheckoutAddress | null;
  reverseLoading: boolean;
  reverseError: string | null;
  streetNumber: string;
  onStreetNumberChange: (streetNumber: string) => void;
  floor: string;
  onFloorChange: (floor: string) => void;
  bell: string;
  onBellChange: (bell: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  deliveryPreferences: string[];
  onDeliveryPreferencesChange: (preferences: string[]) => void;
  manualPinConfirmed: boolean;
  onManualPinConfirmedChange: (confirmed: boolean) => void;
  zoneResult: DeliveryZoneResult | null;
  zoneLoading: boolean;
  canConfirm: boolean;
  onConfirm: () => void;
  pinMovedFromSearch: boolean;
  onResetToSearch: () => void;
  canResetToSearch: boolean;
  confidenceLevel?: "high" | "medium" | "low";
  confidenceMessage?: string | null;
  confidenceDetails?: string | null;
  confidenceConfirmationLabel?: string | null;
  onBack: () => void;
};

export function AddressBottomSheet({
  address,
  reverseLoading,
  reverseError,
  streetNumber,
  onStreetNumberChange,
  floor,
  onFloorChange,
  bell,
  onBellChange,
  notes,
  onNotesChange,
  deliveryPreferences,
  onDeliveryPreferencesChange,
  manualPinConfirmed,
  onManualPinConfirmedChange,
  zoneResult,
  zoneLoading,
  canConfirm,
  onConfirm,
  pinMovedFromSearch,
  onResetToSearch,
  canResetToSearch,
  confidenceLevel = "medium",
  confidenceMessage = null,
  confidenceDetails = null,
  confidenceConfirmationLabel = null,
  onBack,
}: AddressBottomSheetProps) {
  const missingStreetNumber = !!address && !streetNumber.trim();
  const outsideByMeters =
    zoneResult?.isAvailable === false && typeof zoneResult.distanceKm === "number"
      ? Math.max(0, Math.round((zoneResult.distanceKm - MAX_DELIVERY_DISTANCE_KM) * 1000))
      : null;

  const togglePreference = (preference: string) => {
    onDeliveryPreferencesChange(
      deliveryPreferences.includes(preference)
        ? deliveryPreferences.filter((item) => item !== preference)
        : [...deliveryPreferences, preference],
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-black/75 backdrop-blur-xl">
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Αλλαγή τοποθεσίας
        </button>
      </div>

      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-red-500/15 text-red-300">
            {reverseLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <MapPin className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-white/45">Τελική διεύθυνση</p>
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

        {confidenceMessage ? (
          <div
            className={`rounded-xl px-3 py-3 text-sm ${
              confidenceLevel === "high"
                ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                : confidenceLevel === "medium"
                  ? "border border-amber-300/25 bg-amber-500/10 text-amber-100"
                  : "border border-red-400/20 bg-red-500/10 text-red-100"
            }`}
          >
            <p className="font-medium">{confidenceMessage}</p>
            {confidenceDetails ? (
              <p className="mt-1 text-xs opacity-85">{confidenceDetails}</p>
            ) : null}
          </div>
        ) : null}

        {zoneResult && (
          <div
            className={`rounded-xl px-3 py-2 text-sm ${
              zoneResult.isAvailable
                ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                : "border border-red-400/20 bg-red-500/10 text-red-200"
            }`}
          >
            {zoneResult.message}
            {!zoneResult.isAvailable && outsideByMeters && outsideByMeters > 0 ? (
              <p className="mt-1 text-xs text-red-100/85">
                Το σημείο βρίσκεται περίπου {outsideByMeters}μ. εκτός της ζώνης διανομής.
              </p>
            ) : null}
          </div>
        )}

        {pinMovedFromSearch && (
          <div className="rounded-xl border border-sky-300/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
            Η τελική τοποθεσία βασίζεται στην καρφίτσα.
          </div>
        )}

        {canResetToSearch && (
          <button
            type="button"
            onClick={onResetToSearch}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            ↩ Επιστροφή στο αποτέλεσμα αναζήτησης
          </button>
        )}

        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-white/75">Αριθμός οδού</span>
            <input
              value={streetNumber}
              onChange={(event) => onStreetNumberChange(event.target.value)}
              placeholder="Π.χ. 12"
              inputMode="numeric"
              className="h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-primary"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/75">Όροφος</span>
              <input
                value={floor}
                onChange={(event) => onFloorChange(event.target.value)}
                placeholder="Π.χ. 3ος"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-primary"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-white/75">Κουδούνι</span>
              <input
                value={bell}
                onChange={(event) => onBellChange(event.target.value)}
                placeholder="Π.χ. Παπαδόπουλος"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-primary"
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-white/75">Προτιμήσεις παράδοσης</span>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_PREFERENCES.map((preference) => {
                const selected = deliveryPreferences.includes(preference);
                return (
                  <button
                    key={preference}
                    type="button"
                    onClick={() => togglePreference(preference)}
                    className={`min-h-11 rounded-full border px-4 py-2 text-xs font-medium transition ${
                      selected
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {preference}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-white/75">Οδηγίες για τον διανομέα</span>
            <textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Π.χ. 3ος όροφος, δεξιά είσοδος, κουδούνι Παπαδόπουλος"
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-primary"
            />
          </label>

          {(missingStreetNumber || confidenceLevel !== "high") && confidenceConfirmationLabel ? (
            <label className="flex min-h-11 items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <input
                type="checkbox"
                checked={manualPinConfirmed}
                onChange={(event) => onManualPinConfirmedChange(event.target.checked)}
                className="mt-1 h-5 w-5"
              />
              <span className="text-xs text-white/85">{confidenceConfirmationLabel}</span>
            </label>
          ) : null}

          {manualPinConfirmed && (
            <div className="rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              ✓ Επιβεβαιώθηκε η θέση της καρφίτσας
            </div>
          )}

          {pinMovedFromSearch && (
            <div className="rounded-xl border border-sky-300/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
              Η τελική τοποθεσία βασίζεται στην καρφίτσα.
            </div>
          )}
        </div>

        <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/55">
          Συμπλήρωσε μόνο ό,τι χρειάζεται για να βρει εύκολα ο οδηγός την είσοδο.
        </p>

        <ConfirmAddressButton
          disabled={!canConfirm}
          loading={zoneLoading}
          onConfirm={onConfirm}
          label="Αποθήκευση διεύθυνσης"
          subtitle="Θα χρησιμοποιηθεί η θέση που επέλεξες στον χάρτη."
          loadingLabel="Έλεγχος διεύθυνσης..."
        />
      </div>
    </div>
  );
}
