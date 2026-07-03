import { describe, expect, it } from "vitest";
import { withPinCoordinates } from "../address-parser";

describe("withPinCoordinates", () => {
  it("replaces geocoder center with map pin position", () => {
    const geocoded = {
      formattedAddress: "Mesolongiou 47",
      lat: 38.391,
      lng: 21.824,
    };

    const pinned = withPinCoordinates(geocoded, { lat: 38.391227, lng: 21.824136 });

    expect(pinned.lat).toBe(38.391227);
    expect(pinned.lng).toBe(21.824136);
    expect(pinned.formattedAddress).toBe("Mesolongiou 47");
  });

  it("keeps address when pin is missing", () => {
    const geocoded = { lat: 38.39, lng: 21.82 };
    expect(withPinCoordinates(geocoded, null)).toEqual(geocoded);
  });
});
