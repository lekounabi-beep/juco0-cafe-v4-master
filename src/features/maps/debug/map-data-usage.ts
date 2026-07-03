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
 * DEV-oriented cumulative byte counter for driver map debug (GPS, realtime, tiles).
 */

export type MapDataUsageCategory = "gpsUpload" | "gpsDownload" | "realtime" | "mapTiles";

export type MapDataUsageSnapshot = {
  totalBytes: number;
  totalKbit: number;
  gpsUploadKbit: number;
  gpsDownloadKbit: number;
  realtimeKbit: number;
  mapTilesKbit: number;
};

const bytes: Record<MapDataUsageCategory, number> = {
  gpsUpload: 0,
  gpsDownload: 0,
  realtime: 0,
  mapTiles: 0,
};

const listeners = new Set<() => void>();

function bytesToKbit(n: number): number {
  return (n * 8) / 1000;
}

function buildSnapshot(): MapDataUsageSnapshot {
  const totalBytes = bytes.gpsUpload + bytes.gpsDownload + bytes.realtime + bytes.mapTiles;
  return {
    totalBytes,
    totalKbit: bytesToKbit(totalBytes),
    gpsUploadKbit: bytesToKbit(bytes.gpsUpload),
    gpsDownloadKbit: bytesToKbit(bytes.gpsDownload),
    realtimeKbit: bytesToKbit(bytes.realtime),
    mapTilesKbit: bytesToKbit(bytes.mapTiles),
  };
}

let snapshot = buildSnapshot();

export function estimateJsonBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}

export function trackMapDataBytes(category: MapDataUsageCategory, byteCount: number): void {
  if (!Number.isFinite(byteCount) || byteCount <= 0) return;
  bytes[category] += byteCount;
  snapshot = buildSnapshot();
  listeners.forEach((listener) => listener());
}

export function getMapDataUsageSnapshot(): MapDataUsageSnapshot {
  return snapshot;
}

export function subscribeMapDataUsage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetMapDataUsage(): void {
  bytes.gpsUpload = 0;
  bytes.gpsDownload = 0;
  bytes.realtime = 0;
  bytes.mapTiles = 0;
  snapshot = buildSnapshot();
  listeners.forEach((listener) => listener());
}
