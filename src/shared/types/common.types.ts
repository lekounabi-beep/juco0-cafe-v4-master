/**
 * Common type definitions
 */

export type Maybe<T> = T | null;
export type Optional<T> = T | undefined;

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Address {
  formatted: string;
  coords?: Coordinates;
  notes?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  message: string;
  code?: string | number;
  details?: unknown;
}
