/**
 * Client-side monotonic GPS merge for tracking session.
 * Reuses parse/accept guards from compute-delivery-state.
 */

import {
  parseDeliveryLocationRow,
  shouldAcceptLocationRow,
} from '@/features/delivery/core/compute-delivery-state';
import type { DeliveryLocationRow } from '@/features/delivery/core/delivery-state.types';

export type GpsMergeStats = {
  incoming: number;
  accepted: number;
  rejected: number;
  total: number;
};

function toDeliveryRow(row: unknown): DeliveryLocationRow | null {
  return parseDeliveryLocationRow(row);
}

export function mergeMonotonicLocations(
  existing: DeliveryLocationRow[],
  incoming: unknown[],
): { locations: DeliveryLocationRow[]; stats: GpsMergeStats } {
  const stats: GpsMergeStats = {
    incoming: incoming.length,
    accepted: 0,
    rejected: 0,
    total: 0,
  };

  const sorted = [...existing];
  let lastMs: number | null =
    sorted.length > 0
      ? new Date(sorted[sorted.length - 1]!.recorded_at).getTime()
      : null;

  for (const raw of incoming) {
    const row = toDeliveryRow(raw);
    if (!row) {
      stats.rejected += 1;
      continue;
    }
    if (!shouldAcceptLocationRow(row, lastMs)) {
      stats.rejected += 1;
      continue;
    }
    sorted.push(row);
    lastMs = new Date(row.recorded_at).getTime();
    stats.accepted += 1;
  }

  sorted.sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );

  stats.total = sorted.length;
  return { locations: sorted, stats };
}

export function latestLocationFromRows(
  locations: DeliveryLocationRow[],
): { lat: number; lng: number } | null {
  if (locations.length === 0) return null;
  const last = locations[locations.length - 1]!;
  return { lat: last.lat, lng: last.lng };
}
