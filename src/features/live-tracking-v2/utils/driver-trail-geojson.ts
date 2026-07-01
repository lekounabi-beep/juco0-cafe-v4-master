export type TrailPoint = {
  lat: number;
  lng: number;
  recordedAt?: string;
};

export const TRAIL_GAP_SECONDS = 60;

export type DriverTrailGeoJson = {
  type: 'Feature';
  geometry: {
    type: 'MultiLineString';
    coordinates: [number, number][][];
  };
  properties: Record<string, never>;
};

export function emptyDriverTrailGeoJson(): DriverTrailGeoJson {
  return {
    type: 'Feature',
    geometry: {
      type: 'MultiLineString',
      coordinates: [],
    },
    properties: {},
  };
}

function gapSeconds(prev: TrailPoint, curr: TrailPoint): number | null {
  if (!prev.recordedAt || !curr.recordedAt) return null;
  const prevMs = new Date(prev.recordedAt).getTime();
  const currMs = new Date(curr.recordedAt).getTime();
  if (!Number.isFinite(prevMs) || !Number.isFinite(currMs)) return null;
  return (currMs - prevMs) / 1000;
}

/** Split trail into renderable segments when GPS time gap exceeds threshold. */
export function segmentTrailCoordinates(points: TrailPoint[]): [number, number][][] {
  if (points.length === 0) return [];

  const segmentPoints: TrailPoint[][] = [[points[0]!]];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const dt = gapSeconds(prev, curr);

    if (dt != null && dt > TRAIL_GAP_SECONDS) {
      segmentPoints.push([curr]);
    } else {
      segmentPoints[segmentPoints.length - 1]!.push(curr);
    }
  }

  return segmentPoints
    .filter((segment) => segment.length >= 2)
    .map((segment) => segment.map((point) => [point.lng, point.lat] as [number, number]));
}

/** Compact fingerprint for poll-stable comparisons — no JSON.stringify. */
export function trailPointsSignature(points: TrailPoint[]): string {
  if (points.length === 0) return '0';

  const last = points[points.length - 1]!;
  const segments = segmentTrailCoordinates(points);
  const lastRecordedAt = last.recordedAt ?? '';

  return `${points.length}|${lastRecordedAt}|${last.lat}|${last.lng}|${segments.length}`;
}

/** Mapbox GeoJSON MultiLineString from chronologically ordered trail points. */
export function toDriverTrailGeoJson(points: TrailPoint[]): DriverTrailGeoJson {
  const coordinates = segmentTrailCoordinates(points);

  if (coordinates.length === 0) {
    return emptyDriverTrailGeoJson();
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'MultiLineString',
      coordinates,
    },
    properties: {},
  };
}

export function isTrailRenderable(
  showDriverTrail: boolean,
  points: TrailPoint[],
): boolean {
  if (!showDriverTrail || points.length < 2) return false;
  return segmentTrailCoordinates(points).length > 0;
}

export function trailLayerDataKey(
  points: TrailPoint[],
  visible: boolean,
): string {
  return `${visible ? '1' : '0'}:${trailPointsSignature(points)}`;
}
