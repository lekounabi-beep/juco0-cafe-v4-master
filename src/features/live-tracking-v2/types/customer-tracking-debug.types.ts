import type { ETAResult } from "@/features/delivery/services/eta.service";
import type { TrackingConnectionState } from "@/features/tracking/types/tracking-session.types";

/** Snapshot passed from track page → V2 section → debug panel. */
export type CustomerTrackingDebugSnapshot = {
  connectionState?: TrackingConnectionState;
  trackingSessionEnabled?: boolean;
  pollCount?: number;
  lastPollAt?: string | null;
  gpsPointsLoaded?: number;
  lastGpsTimestamp?: string | null;
  orderStatus?: string;
  assignmentStatus?: string;
  customerStep?: string;
  isTerminal?: boolean;
  eta?: ETAResult | null;
  etaLastUpdated?: string | null;
  /** Explicit override; otherwise derived from connectionState. */
  pollingActive?: boolean;
  trailVisible?: boolean;
  trailPoints?: number;
  trailSourceReady?: boolean;
  trailLayerReady?: boolean;
};
