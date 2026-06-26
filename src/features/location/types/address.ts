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
  manualPinConfirmed?: boolean;
  deliveryZone?: DeliveryZoneResult | null;
};

export type AddressSearchResult = CheckoutAddress & {
  label: string;
  description: string;
};

export type DeliveryZoneResult = {
  isAvailable: boolean;
  message: string;
  distanceKm?: number;
};
