import { DRIVER_AVAILABILITY } from '../types/delivery.types';
import type { DeliveryUiState } from './delivery-ui-selector';

export const DRIVER_UI_STATE = {
  OFFLINE: 'OFFLINE',
  ONLINE_WAITING: 'ONLINE_WAITING',
  ACTIVE_DELIVERY: 'ACTIVE_DELIVERY',
} as const;

export type DriverUiState = (typeof DRIVER_UI_STATE)[keyof typeof DRIVER_UI_STATE];

export function deriveDriverUiState(
  deliveryUi: Pick<DeliveryUiState, 'isOnDelivery'>,
  availability: string
): DriverUiState {
  if (deliveryUi.isOnDelivery) {
    return DRIVER_UI_STATE.ACTIVE_DELIVERY;
  }
  if (availability === DRIVER_AVAILABILITY.ONLINE) {
    return DRIVER_UI_STATE.ONLINE_WAITING;
  }
  return DRIVER_UI_STATE.OFFLINE;
}
