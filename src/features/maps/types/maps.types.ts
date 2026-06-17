/**
 * Maps feature type definitions
 */

import type { Coordinates } from '@/shared/types/common.types';

export interface MapConfig {
  center: Coordinates;
  zoom: number;
  gestureHandling?: 'cooperative' | 'greedy' | 'none' | 'auto';
  disableDefaultUI?: boolean;
}

export interface AutocompleteConfig {
  region?: string;
  language?: string;
}
