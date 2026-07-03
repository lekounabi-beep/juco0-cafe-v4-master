import type { CheckoutAddress } from "../types/address";

export function formatAddressLine(address: CheckoutAddress | null | undefined): string {
  if (!address) return "";
  return [address.street, address.number].filter(Boolean).join(" ") || address.formattedAddress;
}

export function formatAddressArea(address: CheckoutAddress | null | undefined): string {
  if (!address) return "";
  return [address.city, address.postalCode].filter(Boolean).join(", ");
}
