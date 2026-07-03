import type { AddressSearchResult, CheckoutAddress } from "../types/address";

type MapboxContextItem = {
  id?: string;
  text?: string;
  short_code?: string;
};

type MapboxFeature = {
  id?: string;
  text?: string;
  address?: string;
  place_name?: string;
  center?: [number, number];
  context?: MapboxContextItem[];
  place_type?: string[];
  relevance?: number;
};

function contextText(feature: MapboxFeature, prefix: string): string {
  return feature.context?.find((item) => item.id?.startsWith(prefix))?.text ?? "";
}

function countryText(feature: MapboxFeature): string {
  const country = feature.context?.find((item) => item.id?.startsWith("country"));
  return country?.text ?? country?.short_code?.toUpperCase() ?? "";
}

export function parseMapboxFeature(feature: MapboxFeature): AddressSearchResult | null {
  const [lng, lat] = feature.center ?? [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  const street = feature.text ?? "";
  const number = feature.address ?? "";
  const formattedAddress = feature.place_name ?? [street, number].filter(Boolean).join(" ");
  if (!formattedAddress) return null;

  return {
    formattedAddress,
    street,
    number,
    city: contextText(feature, "place") || contextText(feature, "locality"),
    postalCode: contextText(feature, "postcode"),
    country: countryText(feature),
    lat: parsedLat,
    lng: parsedLng,
    placeId: feature.id ?? `${parsedLng},${parsedLat}`,
    notes: "",
    label: [street, number].filter(Boolean).join(" ") || formattedAddress,
    description: formattedAddress,
    geocode: {
      featureType: feature.place_type?.[0],
      relevance: feature.relevance,
      contextKinds: (feature.context ?? [])
        .map((item) => item.id?.split(".")[0])
        .filter((kind): kind is string => !!kind),
    },
  };
}

/** Keep geocoded address text but persist the map pin position (viewport center). */
export function withPinCoordinates<T extends { lat: number; lng: number }>(
  address: T,
  pin: { lat: number; lng: number } | null | undefined,
): T {
  if (
    !pin ||
    !Number.isFinite(pin.lat) ||
    !Number.isFinite(pin.lng) ||
    pin.lat < -90 ||
    pin.lat > 90 ||
    pin.lng < -180 ||
    pin.lng > 180
  ) {
    return address;
  }

  return { ...address, lat: pin.lat, lng: pin.lng };
}

export function isValidCheckoutAddress(
  address: CheckoutAddress | null | undefined,
): address is CheckoutAddress {
  return (
    !!address &&
    address.formattedAddress.trim().length > 0 &&
    Number.isFinite(address.lat) &&
    Number.isFinite(address.lng) &&
    address.lat >= -90 &&
    address.lat <= 90 &&
    address.lng >= -180 &&
    address.lng <= 180
  );
}

export function hasStreetNumber(address: CheckoutAddress | null | undefined): boolean {
  return !!address?.number?.trim();
}

export function isCompleteCheckoutAddress(address: CheckoutAddress | null | undefined): boolean {
  return (
    isValidCheckoutAddress(address) &&
    address.deliveryZone?.isAvailable === true &&
    (hasStreetNumber(address) || address.manualPinConfirmed === true)
  );
}
