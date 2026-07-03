/**
 * Driver store using Zustand
 * Manages driver state across the application
 */

import { create } from "zustand";
import type { DriverProfile, DriverAvailability } from "../types/delivery.types";
import type { Coordinates } from "@/shared/types/common.types";

interface DriverState {
  // Driver profile
  driver: DriverProfile | null;

  // Availability
  availabilityStatus: DriverAvailability;
  currentLocation: Coordinates | null;
  lastLocationUpdate: string | null;

  // Loading states
  loading: boolean;
  error: string | null;

  // Actions
  setDriver: (driver: DriverProfile | null) => void;
  setAvailabilityStatus: (status: DriverAvailability) => void;
  setCurrentLocation: (location: Coordinates | null) => void;
  setLastLocationUpdate: (timestamp: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  driver: null,
  availabilityStatus: "offline" as DriverAvailability,
  currentLocation: null,
  lastLocationUpdate: null,
  loading: false,
  error: null,
};

export const useDriverStore = create<DriverState>((set) => ({
  ...initialState,

  setDriver: (driver) => set({ driver }),

  setAvailabilityStatus: (availabilityStatus) => set({ availabilityStatus }),

  setCurrentLocation: (currentLocation) => set({ currentLocation }),

  setLastLocationUpdate: (lastLocationUpdate) => set({ lastLocationUpdate }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
