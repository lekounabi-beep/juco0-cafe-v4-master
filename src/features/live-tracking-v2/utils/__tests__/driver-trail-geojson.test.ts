import { describe, expect, it, vi } from "vitest";
import {
  emptyDriverTrailGeoJson,
  isTrailRenderable,
  segmentTrailCoordinates,
  toDriverTrailGeoJson,
  trailLayerDataKey,
  trailPointsSignature,
} from "@/features/live-tracking-v2/utils/driver-trail-geojson";
import {
  getLastAppliedTrailLayerKey,
  resetTrailLayerCache,
  shouldApplyTrailLayerUpdate,
  updateDriverTrailLayer,
} from "@/features/live-tracking-v2/utils/driver-trail-mapbox";

describe("driver-trail-geojson", () => {
  it("returns empty MultiLineString for no points", () => {
    const geo = emptyDriverTrailGeoJson();
    expect(geo.geometry.type).toBe("MultiLineString");
    expect(geo.geometry.coordinates).toEqual([]);
  });

  it("maps points to lng,lat coordinates in one segment", () => {
    const geo = toDriverTrailGeoJson([
      { lat: 38.1, lng: 21.8, recordedAt: "2026-01-01T10:00:00Z" },
      { lat: 38.2, lng: 21.9, recordedAt: "2026-01-01T10:00:10Z" },
      { lat: 38.3, lng: 22.0, recordedAt: "2026-01-01T10:00:20Z" },
    ]);
    expect(geo.geometry.coordinates).toEqual([
      [
        [21.8, 38.1],
        [21.9, 38.2],
        [22.0, 38.3],
      ],
    ]);
  });

  it("splits into multiple segments when offline gap exceeds 60 seconds", () => {
    const points = [
      { lat: 38.1, lng: 21.8, recordedAt: "2026-01-01T10:00:00Z" },
      { lat: 38.2, lng: 21.9, recordedAt: "2026-01-01T10:00:10Z" },
      { lat: 38.5, lng: 22.2, recordedAt: "2026-01-01T10:02:30Z" },
      { lat: 38.6, lng: 22.3, recordedAt: "2026-01-01T10:02:40Z" },
    ];

    expect(segmentTrailCoordinates(points)).toEqual([
      [
        [21.8, 38.1],
        [21.9, 38.2],
      ],
      [
        [22.2, 38.5],
        [22.3, 38.6],
      ],
    ]);
  });

  it("requires showDriverTrail and at least one renderable segment", () => {
    expect(isTrailRenderable(true, [{ lat: 1, lng: 2, recordedAt: "2026-01-01T10:00:00Z" }])).toBe(
      false,
    );
    expect(isTrailRenderable(true, [])).toBe(false);
    expect(
      isTrailRenderable(false, [
        { lat: 1, lng: 2, recordedAt: "2026-01-01T10:00:00Z" },
        { lat: 3, lng: 4, recordedAt: "2026-01-01T10:00:10Z" },
      ]),
    ).toBe(false);
    expect(
      isTrailRenderable(true, [
        { lat: 1, lng: 2, recordedAt: "2026-01-01T10:00:00Z" },
        { lat: 3, lng: 4, recordedAt: "2026-01-01T10:00:10Z" },
      ]),
    ).toBe(true);
  });

  it("keeps the same signature between polls when trail is unchanged", () => {
    const pollA = [
      { lat: 38.1, lng: 21.8, recordedAt: "2026-01-01T10:00:00Z" },
      { lat: 38.2, lng: 21.9, recordedAt: "2026-01-01T10:00:10Z" },
    ];
    const pollB = [
      { lat: 38.1, lng: 21.8, recordedAt: "2026-01-01T10:00:00Z" },
      { lat: 38.2, lng: 21.9, recordedAt: "2026-01-01T10:00:10Z" },
    ];

    expect(trailPointsSignature(pollA)).toBe(trailPointsSignature(pollB));
    expect(trailLayerDataKey(pollA, true)).toBe(trailLayerDataKey(pollB, true));
  });
});

describe("driver-trail-mapbox", () => {
  it("skips setData when trail layer key is unchanged", () => {
    resetTrailLayerCache();

    const points = [
      { lat: 38.1, lng: 21.8, recordedAt: "2026-01-01T10:00:00Z" },
      { lat: 38.2, lng: 21.9, recordedAt: "2026-01-01T10:00:10Z" },
    ];
    const geoJson = toDriverTrailGeoJson(points);
    const dataKey = trailLayerDataKey(points, true);

    const setData = vi.fn();
    const map = {
      getSource: () => ({ setData }),
      getLayer: () => ({}),
      setLayoutProperty: vi.fn(),
    } as unknown as import("mapbox-gl").Map;

    updateDriverTrailLayer(map, geoJson, true, dataKey);
    updateDriverTrailLayer(map, geoJson, true, dataKey);

    expect(setData).toHaveBeenCalledTimes(1);
    expect(shouldApplyTrailLayerUpdate(getLastAppliedTrailLayerKey(), dataKey)).toBe(false);
  });
});
