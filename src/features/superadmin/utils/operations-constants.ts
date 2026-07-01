/** SuperAdmin operational thresholds — read-only diagnostics only. */

export const SUPERADMIN_GPS_STALE_MS = 60_000;

export const ORDER_DURATION_THRESHOLDS_MIN = {
  preparing: 20,
  ready: 15,
  delivering: 45,
} as const;

export const ORDER_WAITING_THRESHOLD_MIN = 30;
