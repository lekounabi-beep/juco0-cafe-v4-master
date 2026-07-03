"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { MapDynamicLoading } from "@/features/maps/components/MapDynamicLoading";
import type { AddressSearchResult, CheckoutAddress, DeliveryZoneResult } from "../types/address";
import { isValidCheckoutAddress, withPinCoordinates } from "../services/address-parser";
import { validateDeliveryZone } from "../services/delivery-zone";
import { useAddressSearch } from "../hooks/useAddressSearch";
import { useReverseGeocode } from "../hooks/useReverseGeocode";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { AddressBottomSheet } from "./AddressBottomSheet";
import { ConfirmAddressButton } from "./ConfirmAddressButton";

const AddressMap = dynamic(() => import("./AddressMap").then((m) => m.AddressMap), {
  ssr: false,
  loading: () => <MapDynamicLoading className="absolute inset-0" />,
});
import { useIsMobile } from "@/hooks/use-mobile";

type CheckoutAddressPickerProps = {
  isOpen: boolean;
  initialAddress: CheckoutAddress | null;
  onClose: () => void;
  onConfirm: (address: CheckoutAddress) => void;
};

const SEARCH_PIN_MOVED_BADGE_DISTANCE_METERS = 20;
const SEARCH_PIN_RESET_DISTANCE_METERS = 100;
const HIGH_CONFIDENCE_PIN_DISTANCE_METERS = 35;
const LOW_CONFIDENCE_PIN_DISTANCE_METERS = 120;

function coordsKey(coords: { lat: number; lng: number } | null): string | null {
  if (!coords) return null;
  return `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
}

function sameCoords(
  a: { lat: number; lng: number } | null | undefined,
  b: { lat: number; lng: number } | null | undefined,
) {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) < 0.000001 && Math.abs(a.lng - b.lng) < 0.000001;
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}

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
  const isMobile = useIsMobile();
  const [query, setQuery] = useState(initialAddress?.formattedAddress ?? "");
  const [draftAddress, setDraftAddress] = useState<CheckoutAddress | null>(initialAddress);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [target, setTarget] = useState<{ lat: number; lng: number } | null>(initialAddress);
  const [streetNumber, setStreetNumber] = useState(initialAddress?.number ?? "");
  const [floor, setFloor] = useState(initialAddress?.floor ?? "");
  const [bell, setBell] = useState(initialAddress?.bell ?? "");
  const [notes, setNotes] = useState(initialAddress?.notes ?? "");
  const [deliveryPreferences, setDeliveryPreferences] = useState<string[]>(
    initialAddress?.deliveryPreferences ?? [],
  );
  const [manualPinConfirmed, setManualPinConfirmed] = useState(
    initialAddress?.manualPinConfirmed ?? false,
  );
  const [zoneResult, setZoneResult] = useState<DeliveryZoneResult | null>(null);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [mapMountKey, setMapMountKey] = useState(0);
  const [shouldMountMap, setShouldMountMap] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastMapView, setLastMapView] = useState<{ lat: number; lng: number; zoom: number } | null>(
    null,
  );
  const [searchAnchor, setSearchAnchor] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<AddressSearchResult | null>(
    null,
  );
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [showMapHelper, setShowMapHelper] = useState(true);
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null);
  const [flowStep, setFlowStep] = useState<"map" | "details">("map");
  const [pinSyncPending, setPinSyncPending] = useState(false);
  const [resolvedPinKey, setResolvedPinKey] = useState<string | null>(null);
  const draftAddressRef = useRef<CheckoutAddress | null>(draftAddress);

  draftAddressRef.current = draftAddress;

  const {
    results,
    loading: searchLoading,
    error: searchError,
  } = useAddressSearch(query, isOpen && flowStep === "map" && searchDropdownOpen);
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
    setMapCenter(initialAddress ? { lat: initialAddress.lat, lng: initialAddress.lng } : null);
    setStreetNumber(initialAddress?.number ?? "");
    setFloor(initialAddress?.floor ?? "");
    setBell(initialAddress?.bell ?? "");
    setNotes(initialAddress?.notes ?? "");
    setDeliveryPreferences(initialAddress?.deliveryPreferences ?? []);
    setManualPinConfirmed(initialAddress?.manualPinConfirmed ?? false);
    setZoneResult(initialAddress?.deliveryZone ?? null);
    setLocationError(null);
    setLocationSuccess(null);
    setSelectedSearchResult(null);
    setSearchAnchor(initialAddress ? { lat: initialAddress.lat, lng: initialAddress.lng } : null);
    setSearchDropdownOpen(false);
    setShowMapHelper(true);
    setFlowStep("map");
    setPinSyncPending(false);
    setResolvedPinKey(
      initialAddress ? coordsKey({ lat: initialAddress.lat, lng: initialAddress.lng }) : null,
    );
  }, [initialAddress, isMobile, isOpen]);

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
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!reversedAddress || !mapCenter) return;
    const next = withPinCoordinates(
      withNotes(reversedAddress, draftAddressRef.current?.notes ?? ""),
      mapCenter,
    );
    setDraftAddress(next);
    setStreetNumber(next.number);
    setManualPinConfirmed(false);
    setZoneResult(null);
    setResolvedPinKey(coordsKey(mapCenter));
    setPinSyncPending(false);
  }, [reversedAddress, mapCenter]);

  useEffect(() => {
    if (reverseError && mapCenter) {
      setResolvedPinKey(coordsKey(mapCenter));
      setPinSyncPending(false);
    }
  }, [mapCenter, reverseError]);

  const handleSelect = useCallback((result: AddressSearchResult) => {
    const pin = { lat: result.lat, lng: result.lng };
    setQuery(result.formattedAddress);
    setPinSyncPending(true);
    setManualPinConfirmed(false);
    setMapCenter(pin);
    setTarget(pin);
    setZoneResult(null);
    setLocationError(null);
    setLocationSuccess(null);
    setSelectedSearchResult(result);
    setSearchAnchor(pin);
    setSearchDropdownOpen(false);
  }, []);

  const handleMoveEnd = useCallback((coords: { lat: number; lng: number }) => {
    setMapCenter((current) => (sameCoords(current, coords) ? current : coords));
    setPinSyncPending(true);
    setManualPinConfirmed(false);
    setZoneResult(null);
    setSearchDropdownOpen(false);
  }, []);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(
        isMobile
          ? "Δεν ήταν δυνατή η πρόσβαση στην τοποθεσία σου."
          : "Η αυτόματη τοποθεσία δεν είναι διαθέσιμη σε αυτή τη συσκευή. Αναζήτησε τη διεύθυνσή σου ή τοποθέτησε την καρφίτσα χειροκίνητα.",
      );
      return;
    }

    setLocationLoading(true);
    setLocationError(null);
    setLocationSuccess(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setTarget(coords);
        setMapCenter(coords);
        setPinSyncPending(true);
        setSearchAnchor(coords);
        setZoneResult(null);
        setManualPinConfirmed(false);
        setLocationLoading(false);
        setLocationSuccess("✓ Βρέθηκε η τοποθεσία");
        setSelectedSearchResult(null);
      },
      () => {
        setLocationLoading(false);
        setLocationError(
          isMobile
            ? "Δεν ήταν δυνατός ο εντοπισμός της τοποθεσίας σου."
            : "Η αυτόματη τοποθεσία δεν είναι διαθέσιμη σε αυτή τη συσκευή.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  }, [isMobile]);

  const pinMovedDistance = searchAnchor && mapCenter ? distanceMeters(searchAnchor, mapCenter) : 0;
  const pinMovedFromSearch = pinMovedDistance > SEARCH_PIN_MOVED_BADGE_DISTANCE_METERS;
  const canResetToSearch = pinMovedDistance > SEARCH_PIN_RESET_DISTANCE_METERS;

  const handleResetToSearch = useCallback(() => {
    if (!searchAnchor) return;
    setTarget((current) => (sameCoords(current, searchAnchor) ? current : searchAnchor));
    setMapCenter((current) => (sameCoords(current, searchAnchor) ? current : searchAnchor));
    setPinSyncPending(true);
    setZoneResult(null);
    setManualPinConfirmed(false);
  }, [searchAnchor]);

  const pinDistanceFromSearch =
    searchAnchor && mapCenter ? distanceMeters(searchAnchor, mapCenter) : 0;

  const confidence = useMemo(() => {
    const reverseFeatureType = reversedAddress?.geocode?.featureType ?? "";
    const selectedFeatureType = selectedSearchResult?.geocode?.featureType ?? "";
    const featureType = reverseFeatureType || selectedFeatureType;
    const hasNumber = streetNumber.trim().length > 0 || !!draftAddress?.number?.trim();
    const isBuildingFeature = featureType === "address" || featureType === "poi";
    const isAreaFeature = featureType === "place" || featureType === "postcode";
    const hasAddress = !!draftAddress?.formattedAddress?.trim();

    if (!hasAddress) {
      return {
        level: "low" as const,
        message: "Δεν μπορέσαμε να επιβεβαιώσουμε με ακρίβεια το σημείο παράδοσης.",
        details: "Μεγέθυνε τον χάρτη και τοποθέτησε την καρφίτσα στο ακριβές σημείο.",
        confirmationLabel: "Ναι, αυτή είναι η σωστή τοποθεσία",
      };
    }

    if (isAreaFeature) {
      return {
        level: "low" as const,
        message: "Η αναζήτηση εντόπισε μόνο την περιοχή.",
        details: "Μεγέθυνε τον χάρτη και τοποθέτησε την καρφίτσα στο ακριβές σημείο.",
        confirmationLabel: "Ναι, αυτή είναι η σωστή τοποθεσία",
      };
    }

    if (!isBuildingFeature && !hasNumber) {
      return {
        level: "low" as const,
        message: "Δεν εντοπίστηκε συγκεκριμένο κτήριο.",
        details: "Τοποθέτησε την καρφίτσα όσο πιο κοντά γίνεται στην είσοδο.",
        confirmationLabel: "Ναι, αυτή είναι η σωστή τοποθεσία",
      };
    }

    if (
      hasNumber &&
      isBuildingFeature &&
      pinDistanceFromSearch <= HIGH_CONFIDENCE_PIN_DISTANCE_METERS
    ) {
      return {
        level: "high" as const,
        message: "Η τοποθεσία φαίνεται ακριβής.",
        details: "Βρέθηκε συγκεκριμένο σημείο κοντά στην καρφίτσα.",
        confirmationLabel: null,
      };
    }

    if (
      !hasNumber ||
      pinDistanceFromSearch > HIGH_CONFIDENCE_PIN_DISTANCE_METERS ||
      !isBuildingFeature
    ) {
      return {
        level:
          pinDistanceFromSearch > LOW_CONFIDENCE_PIN_DISTANCE_METERS || !reverseFeatureType
            ? ("low" as const)
            : ("medium" as const),
        message:
          pinDistanceFromSearch > LOW_CONFIDENCE_PIN_DISTANCE_METERS || !reverseFeatureType
            ? "Δεν μπορέσαμε να επιβεβαιώσουμε με ακρίβεια το σημείο παράδοσης."
            : "Επιβεβαίωσε ότι η καρφίτσα βρίσκεται στην είσοδο του σημείου παράδοσης.",
        details: !hasNumber
          ? "Δεν εντοπίστηκε αριθμός οδού. Συμπλήρωσέ τον αν τον γνωρίζεις."
          : "Η τελική τοποθεσία βασίζεται στην καρφίτσα και όχι μόνο στο αποτέλεσμα αναζήτησης.",
        confirmationLabel:
          pinDistanceFromSearch > LOW_CONFIDENCE_PIN_DISTANCE_METERS || !reverseFeatureType
            ? "Ναι, αυτή είναι η σωστή τοποθεσία"
            : "Επιβεβαιώνω",
      };
    }

    return {
      level: "medium" as const,
      message: "Επιβεβαίωσε ότι η καρφίτσα βρίσκεται στην είσοδο του σημείου παράδοσης.",
      details: "Έλεγξε ότι το pin δείχνει το ακριβές σημείο παράδοσης.",
      confirmationLabel: "Επιβεβαιώνω",
    };
  }, [draftAddress, pinDistanceFromSearch, reversedAddress, selectedSearchResult, streetNumber]);

  const hasAddressConfidence = confidence.level === "high" || manualPinConfirmed;
  const currentPinKey = coordsKey(mapCenter);
  const canProceedToDetails = useMemo(
    () =>
      isValidCheckoutAddress(draftAddress) &&
      mapCenter != null &&
      !reverseLoading &&
      !pinSyncPending &&
      currentPinKey != null &&
      resolvedPinKey === currentPinKey,
    [currentPinKey, draftAddress, mapCenter, pinSyncPending, resolvedPinKey, reverseLoading],
  );

  const canConfirm = useMemo(
    () =>
      isValidCheckoutAddress(draftAddress) &&
      mapCenter != null &&
      !reverseLoading &&
      hasAddressConfidence &&
      zoneResult?.isAvailable !== false,
    [draftAddress, mapCenter, hasAddressConfidence, reverseLoading, zoneResult],
  );

  const search = (
    <AddressAutocomplete
      query={query}
      onQueryChange={(nextQuery) => {
        setQuery(nextQuery);
        setSearchDropdownOpen(true);
      }}
      results={results}
      loading={searchLoading}
      error={searchError}
      onSelect={handleSelect}
      onInputFocus={() => setSearchDropdownOpen(true)}
      dropdownOpen={searchDropdownOpen}
      mobile={isMobile}
    />
  );

  const handleProceedToDetails = useCallback(() => {
    if (!canProceedToDetails) return;
    setFlowStep("details");
  }, [canProceedToDetails]);

  const handleBackToMap = useCallback(() => {
    setFlowStep("map");
    setSearchDropdownOpen(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!isValidCheckoutAddress(draftAddress)) return;

    if (!streetNumber.trim() && !manualPinConfirmed) return;

    const pinCoords = mapCenter ?? { lat: draftAddress.lat, lng: draftAddress.lng };
    const candidate = withPinCoordinates(
      {
        ...draftAddress,
        number: streetNumber.trim(),
        floor: floor.trim(),
        bell: bell.trim(),
        notes: notes.trim(),
        deliveryPreferences,
        manualPinConfirmed,
        deliveryZone: null,
      },
      pinCoords,
    );
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
  }, [
    bell,
    deliveryPreferences,
    draftAddress,
    floor,
    manualPinConfirmed,
    mapCenter,
    notes,
    onClose,
    onConfirm,
    streetNumber,
  ]);

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

      {flowStep === "map" ? (
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-x-0 top-3 z-30 px-3 lg:left-1/2 lg:w-[420px] lg:-translate-x-1/2 lg:px-0">
            {search}
          </div>

          {shouldMountMap && (
            <AddressMap
              key={mapMountKey}
              isOpen={isOpen}
              target={target}
              initialAddress={initialAddress}
              onMoveEnd={handleMoveEnd}
              onMoveStart={() => {
                setShowMapHelper(false);
              }}
              initialView={lastMapView}
              onViewChange={setLastMapView}
              onCenterToCurrentLocation={handleUseCurrentLocation}
              locationLoading={locationLoading}
              showMapHelper={showMapHelper}
            />
          )}

          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
              isMobile ? "" : "mx-auto max-w-md"
            }`}
          >
            <div className="pointer-events-auto mx-auto max-w-sm">
              <ConfirmAddressButton
                disabled={!canProceedToDetails}
                loading={false}
                onConfirm={handleProceedToDetails}
                label="Επιβεβαίωση τοποθεσίας"
                subtitle="Στο επόμενο βήμα θα συμπληρώσεις αριθμό και σημειώσεις."
                loadingLabel="Έλεγχος διεύθυνσης..."
                className="mx-auto w-auto min-w-[16rem] border border-white/10 bg-black/75 px-6 backdrop-blur-xl"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 max-h-dvh flex-1 flex-col overflow-hidden bg-black lg:grid lg:grid-cols-[minmax(0,1fr)_440px]">
          <div className="relative h-[28svh] min-h-[220px] overflow-hidden border-b border-white/10 lg:h-full lg:border-b-0 lg:border-r">
            {shouldMountMap && (
              <AddressMap
                key={mapMountKey}
                isOpen={isOpen}
                target={mapCenter}
                initialAddress={initialAddress}
                onMoveEnd={handleMoveEnd}
                onMoveStart={() => setShowMapHelper(false)}
                initialView={lastMapView}
                onViewChange={setLastMapView}
                showMapHelper={false}
              />
            )}
            <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-xs text-white/75 backdrop-blur-md">
              Preview τοποθεσίας
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <AddressBottomSheet
              address={draftAddress}
              reverseLoading={reverseLoading}
              reverseError={reverseError}
              streetNumber={streetNumber}
              onStreetNumberChange={(nextStreetNumber) => {
                setStreetNumber(nextStreetNumber);
                setManualPinConfirmed(false);
                setZoneResult(null);
              }}
              floor={floor}
              onFloorChange={setFloor}
              bell={bell}
              onBellChange={setBell}
              notes={notes}
              onNotesChange={setNotes}
              deliveryPreferences={deliveryPreferences}
              onDeliveryPreferencesChange={setDeliveryPreferences}
              manualPinConfirmed={manualPinConfirmed}
              onManualPinConfirmedChange={setManualPinConfirmed}
              zoneResult={zoneResult}
              zoneLoading={zoneLoading}
              canConfirm={canConfirm}
              onConfirm={handleConfirm}
              pinMovedFromSearch={pinMovedFromSearch}
              onResetToSearch={handleResetToSearch}
              canResetToSearch={canResetToSearch}
              confidenceLevel={confidence.level}
              confidenceMessage={confidence.message}
              confidenceDetails={confidence.details}
              confidenceConfirmationLabel={confidence.confirmationLabel}
              onBack={handleBackToMap}
            />
          </div>
        </div>
      )}
    </div>
  );
}
