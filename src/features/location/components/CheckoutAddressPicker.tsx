"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { AddressSearchResult, CheckoutAddress, DeliveryZoneResult } from "../types/address";
import { isValidCheckoutAddress } from "../services/address-parser";
import { validateDeliveryZone } from "../services/delivery-zone";
import { useAddressSearch } from "../hooks/useAddressSearch";
import { useReverseGeocode } from "../hooks/useReverseGeocode";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { AddressBottomSheet } from "./AddressBottomSheet";
import { AddressMap } from "./AddressMap";

type CheckoutAddressPickerProps = {
  isOpen: boolean;
  initialAddress: CheckoutAddress | null;
  onClose: () => void;
  onConfirm: (address: CheckoutAddress) => void;
};

function withNotes(address: AddressSearchResult | CheckoutAddress, notes: string): CheckoutAddress {
  return {
    formattedAddress: address.formattedAddress,
    street: address.street,
    number: address.number,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
    lat: address.lat,
    lng: address.lng,
    placeId: address.placeId,
    notes,
    manualPinConfirmed: address.manualPinConfirmed ?? false,
    deliveryZone: address.deliveryZone ?? null,
  };
}

export function CheckoutAddressPicker({
  isOpen,
  initialAddress,
  onClose,
  onConfirm,
}: CheckoutAddressPickerProps) {
  const [query, setQuery] = useState(initialAddress?.formattedAddress ?? "");
  const [draftAddress, setDraftAddress] = useState<CheckoutAddress | null>(initialAddress);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [target, setTarget] = useState<{ lat: number; lng: number } | null>(initialAddress);
  const [streetNumber, setStreetNumber] = useState(initialAddress?.number ?? "");
  const [manualPinConfirmed, setManualPinConfirmed] = useState(
    initialAddress?.manualPinConfirmed ?? false,
  );
  const [zoneResult, setZoneResult] = useState<DeliveryZoneResult | null>(null);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [mapMountKey, setMapMountKey] = useState(0);
  const [shouldMountMap, setShouldMountMap] = useState(false);

  const { results, loading: searchLoading, error: searchError } = useAddressSearch(query, isOpen);
  const {
    address: reversedAddress,
    loading: reverseLoading,
    error: reverseError,
  } = useReverseGeocode(mapCenter, isOpen && mapCenter != null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery(initialAddress?.formattedAddress ?? "");
    setDraftAddress(initialAddress);
    setTarget(initialAddress);
    setStreetNumber(initialAddress?.number ?? "");
    setManualPinConfirmed(initialAddress?.manualPinConfirmed ?? false);
    setZoneResult(initialAddress?.deliveryZone ?? null);
  }, [initialAddress, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShouldMountMap(false);
      return;
    }

    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        setMapMountKey((key) => key + 1);
        setShouldMountMap(true);
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!reversedAddress) return;
    const next = withNotes(reversedAddress, "");
    setDraftAddress(next);
    setQuery(next.formattedAddress);
    setStreetNumber(next.number);
    setManualPinConfirmed(false);
    setZoneResult(null);
  }, [reversedAddress]);

  const handleSelect = useCallback((result: AddressSearchResult) => {
    const next = withNotes(result, "");
    setDraftAddress(next);
    setQuery(next.formattedAddress);
    setStreetNumber(next.number);
    setManualPinConfirmed(false);
    setTarget({ lat: next.lat, lng: next.lng });
    setZoneResult(null);
  }, []);

  const handleMoveEnd = useCallback((coords: { lat: number; lng: number }) => {
    setMapCenter(coords);
    setManualPinConfirmed(false);
    setZoneResult(null);
  }, []);

  const hasAddressConfidence = streetNumber.trim().length > 0 || manualPinConfirmed;

  const canConfirm = useMemo(
    () =>
      isValidCheckoutAddress(draftAddress) &&
      !reverseLoading &&
      hasAddressConfidence &&
      zoneResult?.isAvailable !== false,
    [draftAddress, hasAddressConfidence, reverseLoading, zoneResult],
  );

  const search = (
    <AddressAutocomplete
      query={query}
      onQueryChange={setQuery}
      results={results}
      loading={searchLoading}
      error={searchError}
      onSelect={handleSelect}
    />
  );

  const handleConfirm = useCallback(async () => {
    if (!isValidCheckoutAddress(draftAddress)) return;

    if (!streetNumber.trim() && !manualPinConfirmed) return;

    const candidate = {
      ...draftAddress,
      number: streetNumber.trim(),
      notes: "",
      manualPinConfirmed,
      deliveryZone: null,
    };
    setZoneLoading(true);
    try {
      const result = await validateDeliveryZone(candidate);
      setZoneResult(result);
      if (!result.isAvailable) return;
      onConfirm({ ...candidate, deliveryZone: result });
      onClose();
    } finally {
      setZoneLoading(false);
    }
  }, [draftAddress, manualPinConfirmed, onClose, onConfirm, streetNumber]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-black transition duration-300 ${
        isOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      <div className="relative z-30 flex items-center justify-between border-b border-white/10 bg-black/65 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onClose}
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
          aria-label="Κλείσιμο"
        >
          <X className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-semibold text-white">Επιλογή διεύθυνσης</h1>
        <div className="h-11 w-11" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="relative min-h-[32svh] flex-1 lg:min-h-0">
          {shouldMountMap && (
            <AddressMap
              key={mapMountKey}
              isOpen={isOpen}
              target={target}
              initialAddress={initialAddress}
              onMoveEnd={handleMoveEnd}
            />
          )}
        </div>

        <AddressBottomSheet
          search={search}
          address={draftAddress}
          reverseLoading={reverseLoading}
          reverseError={reverseError}
          streetNumber={streetNumber}
          onStreetNumberChange={(nextStreetNumber) => {
            setStreetNumber(nextStreetNumber);
            setManualPinConfirmed(false);
            setZoneResult(null);
          }}
          manualPinConfirmed={manualPinConfirmed}
          onManualPinConfirmedChange={setManualPinConfirmed}
          zoneResult={zoneResult}
          zoneLoading={zoneLoading}
          canConfirm={canConfirm}
          onConfirm={handleConfirm}
        />
      </div>
    </div>
  );
}
