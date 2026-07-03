/** Pickup / permission orchestration (local to driver page). */

export type DriverDeliveryPermission = "pending" | "granted" | "denied";

export type DriverDeliveryState = {
  permission: DriverDeliveryPermission;
  gpsReady: boolean;
  isPickingUp: boolean;
};

export const INITIAL_DRIVER_DELIVERY_STATE: DriverDeliveryState = {
  permission: "pending",
  gpsReady: false,
  isPickingUp: false,
};

export function resetDriverDeliveryState(): DriverDeliveryState {
  return { ...INITIAL_DRIVER_DELIVERY_STATE };
}
