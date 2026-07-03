/**
 * @deprecated
 *
 * Legacy tracking pipeline.
 *
 * Replaced by Tracking V2.
 *
 * Do not add new functionality here.
 * Scheduled for removal after V2 validation.
 */
/**
 * Temporary forensic logger for map pipeline audits.
 * DEV only — no behaviour changes.
 */

export type ForensicPipeline = "driver" | "customer" | "shared";

export type ForensicEntry = {
  t: number;
  iso: string;
  pipeline: ForensicPipeline;
  category: string;
  event: string;
  data?: Record<string, unknown>;
};

const MAX_ENTRIES = 200;
const ring: ForensicEntry[] = [];

function isEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function forensicLog(
  pipeline: ForensicPipeline,
  category: string,
  event: string,
  data?: Record<string, unknown>,
): void {
  if (!isEnabled()) return;

  const entry: ForensicEntry = {
    t: Math.round(performance.now()),
    iso: new Date().toISOString(),
    pipeline,
    category,
    event,
    data,
  };

  ring.push(entry);
  if (ring.length > MAX_ENTRIES) ring.shift();

  console.log(`[MAP_FORENSIC:${pipeline}] ${category}/${event}`, entry.t, data ?? "");
}

export function forensicCoord(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string {
  if (lat == null || lng == null) return "—";
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export function getForensicTimeline(): ForensicEntry[] {
  return [...ring];
}

export function dumpForensicTimeline(): string {
  return ring
    .map(
      (e) =>
        `${e.iso} +${e.t}ms [${e.pipeline}] ${e.category}/${e.event}${
          e.data ? " " + JSON.stringify(e.data) : ""
        }`,
    )
    .join("\n");
}

/** Expose on window in dev for copy/paste during field audits. */
export function attachForensicToWindow(): void {
  if (!isEnabled() || typeof window === "undefined") return;
  (
    window as unknown as {
      __MAP_FORENSIC__?: { dump: () => string; timeline: () => ForensicEntry[] };
    }
  ).__MAP_FORENSIC__ = {
    dump: dumpForensicTimeline,
    timeline: getForensicTimeline,
  };
}
