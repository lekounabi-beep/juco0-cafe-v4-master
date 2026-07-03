import { describe, expect, it } from "vitest";
import { mergeMonotonicLocations } from "@/features/tracking/core/tracking-session-merge";

describe("mergeMonotonicLocations", () => {
  it("merges bootstrap trail in order", () => {
    const { locations, stats } = mergeMonotonicLocations(
      [],
      [
        {
          id: "1",
          delivery_assignment_id: "a",
          driver_id: "d",
          lat: 37.9,
          lng: 23.7,
          accuracy: null,
          speed: null,
          heading: null,
          recorded_at: "2026-01-01T10:00:00.000Z",
        },
        {
          id: "2",
          delivery_assignment_id: "a",
          driver_id: "d",
          lat: 37.91,
          lng: 23.71,
          accuracy: null,
          speed: null,
          heading: null,
          recorded_at: "2026-01-01T10:00:15.000Z",
        },
      ],
    );

    expect(locations).toHaveLength(2);
    expect(stats.accepted).toBe(2);
    expect(locations[1]!.lat).toBe(37.91);
  });

  it("rejects stale rows on incremental merge", () => {
    const existing = [
      {
        lat: 37.9,
        lng: 23.7,
        recorded_at: "2026-01-01T10:00:15.000Z",
        heading: 0,
      },
    ];

    const { locations, stats } = mergeMonotonicLocations(existing, [
      {
        id: "1",
        delivery_assignment_id: "a",
        driver_id: "d",
        lat: 37.89,
        lng: 23.69,
        accuracy: null,
        speed: null,
        heading: null,
        recorded_at: "2026-01-01T10:00:00.000Z",
      },
    ]);

    expect(locations).toHaveLength(1);
    expect(stats.rejected).toBe(1);
  });
});
