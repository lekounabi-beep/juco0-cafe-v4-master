import type { TrackingConnectionState } from "@/features/tracking/types/tracking-session.types";

export type GpsFreshness = "fresh" | "stale" | "critical" | "unknown";

export function ageSeconds(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((nowMs - t) / 1000));
}

export function formatDebugTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("el-GR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatCoordAxis(point?: { lat: number; lng: number } | null): {
  lat: string;
  lng: string;
} {
  if (!point) return { lat: "—", lng: "—" };
  return {
    lat: point.lat.toFixed(5),
    lng: point.lng.toFixed(5),
  };
}

export function formatConnectionStateLabel(state?: TrackingConnectionState): string {
  if (!state) return "—";
  if (state === "stopped") return "terminal";
  return state;
}

export function gpsFreshnessFromAge(ageSec: number | null): GpsFreshness {
  if (ageSec == null) return "unknown";
  if (ageSec < 20) return "fresh";
  if (ageSec <= 60) return "stale";
  return "critical";
}

export function gpsFreshnessLabel(freshness: GpsFreshness): string {
  switch (freshness) {
    case "fresh":
      return "Fresh";
    case "stale":
      return "Stale";
    case "critical":
      return "Critical";
    default:
      return "—";
  }
}

export function formatAgeSeconds(ageSec: number | null): string {
  if (ageSec == null) return "—";
  return `${ageSec}s`;
}

export function formatEtaMinutes(remainingTimeSec: number): string {
  const minutes = Math.max(0, Math.round(remainingTimeSec / 60));
  if (minutes === 0) return "<1 min";
  return `${minutes} min`;
}
