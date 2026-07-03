export type CheckoutAddress = {
  formattedAddress: string;
  street: string;
  number: string;
  city: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
  placeId: string;
  notes: string;
  floor?: string;
  bell?: string;
  deliveryPreferences?: string[];
  manualPinConfirmed?: boolean;
  deliveryZone?: DeliveryZoneResult | null;
};

export type GeocodeMetadata = {
  featureType?: string;
  relevance?: number;
  contextKinds?: string[];
};

export type AddressSearchResult = CheckoutAddress & {
  label: string;
  description: string;
  geocode?: GeocodeMetadata;
};

export type DeliveryZoneResult = {
  isAvailable: boolean;
  message: string;
  distanceKm?: number;
};
