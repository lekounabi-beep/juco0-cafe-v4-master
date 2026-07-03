/** Debug panels/telemetry — never enabled in production builds. */
export const ENABLE_TRACKING_V2_DEBUG =
  process.env.NODE_ENV !== "production" &&
  (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_TRACKING_DEBUG === "true");
