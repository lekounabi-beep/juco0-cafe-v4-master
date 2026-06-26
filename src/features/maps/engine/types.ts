/**
 * @deprecated
 *
 * Legacy tracking pipeline.
 *
 * Replaced by Tracking V2.
 *
 * Do not add new functionality here.
 * Scheduled for removal after V2 validation.
 */
/**
 * Shared types for MapEngine system
 */

export interface Address {
  formatted: string;
  components: AddressComponents;
}

export interface AddressComponents {
  street: string;
  number: string;
  area: string;
  postalCode: string;
}

export interface MarkerOptions {
  draggable?: boolean;
  animation?: google.maps.Animation;
  icon?: string | google.maps.Icon | google.maps.Symbol;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export type EventHandler<T = any> = (data: T) => void;
export type Unsubscribe = () => void;
