import type { ComputedDeliveryState, DeliveryLocationRow } from '@/features/delivery/core/delivery-state.types';
import type { CustomerOrderStep } from '@/shared/utils/customer-status';
import type { ETAResult } from '@/features/delivery/services/eta.service';
import type {
  TrackingAssignment,
  TrackingDriver,
  TrackingOrder,
} from '@/features/tracking/hooks/useCustomerTrackingSync';

export type TrackingConnectionState =
  | 'idle'
  | 'polling'
  | 'paused'
  | 'stopped'
  | 'error';

export type TrackingSessionGpsMode = 'none' | 'bootstrap' | 'latest';

export type TrackingSessionGpsPayload = {
  mode: TrackingSessionGpsMode;
  latest: import('@app/actions/tracking-delivery').TrackingLocationRow | null;
  trail: import('@app/actions/tracking-delivery').TrackingLocationRow[];
  serverTime: string;
};

export type TrackingSessionPayload = {
  order: TrackingOrder | null;
  assignment: TrackingAssignment | null;
  driver: TrackingDriver | null;
  gps: TrackingSessionGpsPayload;
};

export type TrackingSessionTimeline = {
  customerStep: CustomerOrderStep;
  orderStatus: string;
  deliveryStatus: string;
};

export type UseTrackingSessionResult = {
  order: TrackingOrder | null;
  assignment: TrackingAssignment | null;
  driver: TrackingDriver | null;
  locations: DeliveryLocationRow[];
  latestLocation: { lat: number; lng: number } | null;
  deliveryState: ComputedDeliveryState;
  routePoints: ComputedDeliveryState['routePoints'];
  eta: ETAResult | null;
  timeline: TrackingSessionTimeline;
  connectionState: TrackingConnectionState;
  isTerminal: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastPollAt: string | null;
  pollCount: number;
};

export type GetTrackingSessionOptions = {
  gpsMode?: TrackingSessionGpsMode;
};
