"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ENABLE_TRACKING_V2_DEBUG } from "../config/debug";
import type { CustomerTrackingDebugSnapshot } from "../types/customer-tracking-debug.types";
import {
  ageSeconds,
  formatAgeSeconds,
  formatConnectionStateLabel,
  formatCoordAxis,
  formatDebugTime,
  formatEtaMinutes,
  gpsFreshnessFromAge,
  gpsFreshnessLabel,
  type GpsFreshness,
} from "../utils/tracking-debug-format";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export type TrackingV2DebugPanelProps = {
  assignmentId?: string | null;
  connected?: boolean | null;
  loading?: boolean;
  lastGpsAt?: string | null;
  driverLocation?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  mapStatus?: "loading" | "ready" | "error" | string;
  lastRenderTime?: string | null;
  locationError?: string | null;
  renderCount?: number;
  surface?: "customer" | "driver";
  /** Rich customer tracking snapshot (session or legacy path). */
  customerDebug?: CustomerTrackingDebugSnapshot;
};

function yesNo(value: boolean | null | undefined): string {
  if (value == null) return "—";
  return value ? "yes" : "no";
}

function freshnessClass(freshness: GpsFreshness): string {
  switch (freshness) {
    case "fresh":
      return "text-emerald-400";
    case "stale":
      return "text-amber-400";
    case "critical":
      return "text-red-400";
    default:
      return "text-amber-100/70";
  }
}

function DebugRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-amber-200/50">{label}</dt>
      <dd className={`truncate text-right ${valueClassName ?? "text-amber-100/90"}`}>{value}</dd>
    </div>
  );
}

function DebugSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="border-b border-amber-500/20 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-400/70">
        {title}
      </p>
      <dl className="space-y-0.5">{children}</dl>
    </div>
  );
}

function CustomerDebugPanel({
  assignmentId,
  connected,
  loading,
  lastGpsAt,
  driverLocation,
  destination,
  mapStatus,
  lastRenderTime,
  locationError,
  renderCount,
  customerDebug,
  nowMs,
  pageVisible,
  isOnline,
}: TrackingV2DebugPanelProps & {
  nowMs: number;
  pageVisible: boolean;
  isOnline: boolean;
}) {
  const debug = customerDebug ?? {};
  const connectionState = debug.connectionState;
  const connectionLabel = formatConnectionStateLabel(connectionState);

  const lastPollAt = debug.lastPollAt ?? null;
  const lastPollAgeSec = ageSeconds(lastPollAt, nowMs);

  const lastGpsTimestamp = debug.lastGpsTimestamp ?? lastGpsAt ?? null;
  const gpsAgeSec = ageSeconds(lastGpsTimestamp, nowMs);
  const gpsFreshness = gpsFreshnessFromAge(gpsAgeSec);

  const driverCoords = formatCoordAxis(driverLocation);
  const destCoords = formatCoordAxis(destination);

  const isTerminal = debug.isTerminal === true || connectionState === "stopped";

  const pollingActive =
    debug.pollingActive ??
    (connectionState === "polling" || (connectionState == null && connected === true && !loading));

  const shouldPoll = !isTerminal && pageVisible && isOnline && connectionState !== "error";

  const alerts = useMemo(() => {
    const items: string[] = [];
    if (gpsAgeSec != null && gpsAgeSec > 30) {
      items.push("⚠ Driver GPS stale");
    }
    if (
      !isTerminal &&
      lastPollAgeSec != null &&
      lastPollAgeSec > 10 &&
      connectionState !== "paused"
    ) {
      items.push("⚠ Polling appears stalled");
    }
    if (assignmentId && driverLocation == null) {
      items.push("⚠ No driver location available");
    }
    return items;
  }, [gpsAgeSec, isTerminal, lastPollAgeSec, connectionState, assignmentId, driverLocation]);

  const eta = debug.eta;
  const hasEta = eta != null && eta.eta != null && !eta.isArrived;

  return (
    <>
      {alerts.length > 0 && (
        <div className="mb-2 space-y-1">
          {alerts.map((alert) => (
            <p
              key={alert}
              className="rounded border border-amber-400/40 bg-amber-500/15 px-2 py-1 text-[10px] font-medium text-amber-200"
            >
              {alert}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        <DebugSection title="Session">
          <DebugRow label="Assignment ID" value={assignmentId ?? "—"} />
          <DebugRow label="Connection State" value={connectionLabel} />
          <DebugRow label="Tracking Session Enabled" value={yesNo(debug.trackingSessionEnabled)} />
          <DebugRow
            label="Poll Count"
            value={debug.pollCount != null ? String(debug.pollCount) : "—"}
          />
          <DebugRow label="Last Poll At" value={formatDebugTime(lastPollAt)} />
          <DebugRow label="Seconds Since Last Poll" value={formatAgeSeconds(lastPollAgeSec)} />
          <DebugRow label="Connected (legacy)" value={yesNo(connected)} />
          <DebugRow label="Loading" value={yesNo(loading)} />
        </DebugSection>

        <DebugSection title="GPS">
          <DebugRow label="Driver Latitude" value={driverCoords.lat} />
          <DebugRow label="Driver Longitude" value={driverCoords.lng} />
          <DebugRow label="Destination Latitude" value={destCoords.lat} />
          <DebugRow label="Destination Longitude" value={destCoords.lng} />
          <DebugRow
            label="GPS Points Loaded"
            value={debug.gpsPointsLoaded != null ? String(debug.gpsPointsLoaded) : "—"}
          />
          <DebugRow label="Last GPS Timestamp" value={formatDebugTime(lastGpsTimestamp)} />
          <DebugRow label="GPS Age Seconds" value={formatAgeSeconds(gpsAgeSec)} />
          <DebugRow
            label="GPS Freshness"
            value={gpsFreshnessLabel(gpsFreshness)}
            valueClassName={freshnessClass(gpsFreshness)}
          />
        </DebugSection>

        <DebugSection title="Delivery State">
          <DebugRow label="Order Status" value={debug.orderStatus ?? "—"} />
          <DebugRow label="Assignment Status" value={debug.assignmentStatus ?? "—"} />
          <DebugRow label="Customer Step" value={debug.customerStep ?? "—"} />
          <DebugRow label="Is Terminal" value={yesNo(isTerminal)} />
        </DebugSection>

        <DebugSection title="ETA">
          {hasEta && eta ? (
            <>
              <DebugRow label="ETA Minutes Remaining" value={formatEtaMinutes(eta.remainingTime)} />
              <DebugRow
                label="Estimated Arrival Time"
                value={formatDebugTime(eta.eta?.toISOString())}
              />
              <DebugRow label="ETA Last Updated" value={formatDebugTime(debug.etaLastUpdated)} />
            </>
          ) : (
            <DebugRow label="ETA" value="unavailable" valueClassName="text-amber-200/60" />
          )}
        </DebugSection>

        <DebugSection title="Polling">
          <DebugRow label="Polling Active" value={yesNo(pollingActive)} />
          <DebugRow label="Page Visible" value={yesNo(pageVisible)} />
          <DebugRow label="Online" value={yesNo(isOnline)} />
          <DebugRow label="Should Poll" value={yesNo(shouldPoll)} />
        </DebugSection>

        <DebugSection title="Rendering">
          <DebugRow label="Map Status" value={mapStatus ?? "—"} />
          <DebugRow label="Last Render Time" value={formatDebugTime(lastRenderTime)} />
          <DebugRow label="Render Count" value={renderCount != null ? String(renderCount) : "—"} />
          <DebugRow label="Trail Visible" value={yesNo(debug.trailVisible)} />
          <DebugRow
            label="Trail Points"
            value={debug.trailPoints != null ? String(debug.trailPoints) : "—"}
          />
          <DebugRow
            label="Trail Source"
            value={
              debug.trailSourceReady == null ? "—" : debug.trailSourceReady ? "ready" : "missing"
            }
          />
          <DebugRow
            label="Trail Layer"
            value={
              debug.trailLayerReady == null ? "—" : debug.trailLayerReady ? "ready" : "missing"
            }
          />
        </DebugSection>
      </div>

      {locationError && <p className="mt-2 text-[10px] text-red-300/90">Error: {locationError}</p>}
    </>
  );
}

function DriverDebugPanel({
  assignmentId,
  connected,
  loading,
  lastGpsAt,
  driverLocation,
  destination,
  mapStatus,
  lastRenderTime,
  locationError,
}: TrackingV2DebugPanelProps) {
  const driverCoords = formatCoordAxis(driverLocation);
  const destCoords = formatCoordAxis(destination);

  return (
    <>
      <dl className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
        <div>
          <dt className="text-amber-200/50">Assignment ID</dt>
          <dd className="truncate">{assignmentId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Connected</dt>
          <dd>{connected == null ? "—" : connected ? "yes" : "no"}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Loading</dt>
          <dd>{loading == null ? "—" : loading ? "yes" : "no"}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Last GPS</dt>
          <dd>{formatDebugTime(lastGpsAt)}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Driver</dt>
          <dd>{`${driverCoords.lat}, ${driverCoords.lng}`}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Destination</dt>
          <dd>{`${destCoords.lat}, ${destCoords.lng}`}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Map status</dt>
          <dd>{mapStatus ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-amber-200/50">Last render</dt>
          <dd>{formatDebugTime(lastRenderTime)}</dd>
        </div>
      </dl>
      {locationError && <p className="mt-1 text-amber-300/80">Error: {locationError}</p>}
    </>
  );
}

export function TrackingV2DebugPanel(props: TrackingV2DebugPanelProps) {
  const { surface = "customer" } = props;

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [pageVisible, setPageVisible] = useState(true);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  if (!ENABLE_TRACKING_V2_DEBUG) return null;

  return (
    <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 font-mono text-[10px] leading-relaxed text-amber-100/90">
      <p className="mb-2 font-semibold uppercase tracking-wide text-amber-400/80">
        Tracking V2 Debug ({surface})
      </p>

      {surface === "customer" ? (
        <CustomerDebugPanel
          {...props}
          nowMs={nowMs}
          pageVisible={pageVisible}
          isOnline={isOnline}
        />
      ) : (
        <DriverDebugPanel {...props} />
      )}
    </div>
  );
}

export type { CustomerTrackingDebugSnapshot };
