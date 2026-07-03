import { describe, expect, it } from "vitest";
import { deriveDriverUiState, DRIVER_UI_STATE } from "../derive-driver-ui-state";
import { DRIVER_AVAILABILITY } from "../../types/delivery.types";

describe("deriveDriverUiState", () => {
  it("returns ACTIVE_DELIVERY when on delivery", () => {
    expect(deriveDriverUiState({ isOnDelivery: true }, DRIVER_AVAILABILITY.OFFLINE)).toBe(
      DRIVER_UI_STATE.ACTIVE_DELIVERY,
    );
  });

  it("returns ONLINE_WAITING when online and not on delivery", () => {
    expect(deriveDriverUiState({ isOnDelivery: false }, DRIVER_AVAILABILITY.ONLINE)).toBe(
      DRIVER_UI_STATE.ONLINE_WAITING,
    );
  });

  it("returns OFFLINE when offline and not on delivery", () => {
    expect(deriveDriverUiState({ isOnDelivery: false }, DRIVER_AVAILABILITY.OFFLINE)).toBe(
      DRIVER_UI_STATE.OFFLINE,
    );
  });
});
