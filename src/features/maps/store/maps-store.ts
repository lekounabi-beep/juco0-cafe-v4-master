/**
 * Maps store using Zustand
 * Replaces custom event communication
 */

import { create } from 'zustand';
import type { Coordinates } from '@/shared/types/common.types';

interface MapsState {
  // Map state
  mapCenter: Coordinates | null;
  selectedAddress: string | null;
  selectedCoords: Coordinates | null;
  isMapLoaded: boolean;
  loadError: string | null;
  
  // Actions
  setMapCenter: (center: Coordinates) => void;
  setSelectedAddress: (address: string) => void;
  setSelectedCoords: (coords: Coordinates) => void;
  setMapLoaded: (loaded: boolean) => void;
  setLoadError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  mapCenter: null,
  selectedAddress: null,
  selectedCoords: null,
  isMapLoaded: false,
  loadError: null,
};

export const useMapsStore = create<MapsState>((set) => ({
  ...initialState,
  
  setMapCenter: (center) => set({ mapCenter: center }),
  setSelectedAddress: (address) => set({ selectedAddress: address }),
  setSelectedCoords: (coords) => set({ selectedCoords: coords }),
  setMapLoaded: (loaded) => set({ isMapLoaded: loaded }),
  setLoadError: (error) => set({ loadError: error }),
  
  reset: () => set(initialState),
}));
