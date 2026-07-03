# Tracking V2 — Manual Validation Checklist

Use this checklist before removing the legacy tracking pipeline.  
Enable dev tools: `NODE_ENV=development` (gates `ENABLE_TRACKING_V2_DEBUG`).

Watch console for `[TrackingV2]` and `[TrackingV2] realtime_*` events.

---

## Customer (`/track/:orderId`)

### Order lifecycle

- [ ] **Order created** — V2 section visible when `ENABLE_TRACKING_V2=true`; map mounts with destination marker.
- [ ] **Assignment created** — `assignmentId` appears in debug panel; `useLiveDriverLocation` starts.
- [ ] **No GPS yet** — Map shows destination only; message: _Ο διανομέας δεν έχει ξεκινήσει ακόμη._
- [ ] **First GPS point** — `realtime_gps_update_committed` or `realtime_gps_seed_received`; driver marker appears.
- [ ] **Driver moving** — `driver_updated` + `destination_updated` logs; bounds refit; marker moves smoothly.
- [ ] **Browser refresh** — History seed + realtime reconnect; no stale assignment data.
- [ ] **Browser reconnect** — Tab backgrounded/foregrounded; realtime reconnects (`realtime_connected`).
- [ ] **Network loss** — `realtime_disconnected`; map remains visible; last position retained.
- [ ] **Network recovery** — `realtime_history_resync_*`; position catches up.
- [ ] **Delivery complete** — Legacy timeline updates; V2 map still renders (no crash).

### Customer telemetry expected

| Event                              | When                        |
| ---------------------------------- | --------------------------- |
| `[TrackingV2] mounted`             | V2 section mount            |
| `[TrackingV2] ready`               | Map status → ready          |
| `[TrackingV2] resize`              | After overlay removed       |
| `[TrackingV2] destination_updated` | Destination coords applied  |
| `[TrackingV2] driver_updated`      | Driver coords applied       |
| `realtime_gps_seed_received`       | Initial RPC history         |
| `realtime_connected`               | Supabase channel SUBSCRIBED |

---

## Driver (`/driver`)

### App lifecycle

- [ ] **Cold app start** — `DriverLiveMap` mounts; `[TrackingV2] ready` with `surface: driver`.
- [ ] **Refresh** — Clean unmount (`unmounted`, `map_remove`); new map instance; no blank canvas.
- [ ] **Lock/unlock phone** — Map visible after unlock; `resize` fires.
- [ ] **Background/foreground** — GPS continues via `useDriverPage`; map marker updates.
- [ ] **GPS disabled** — Map still renders; driver marker absent until permission granted.
- [ ] **GPS enabled** — Device marker appears via `driver_updated`.
- [ ] **Network loss** — Map visible; GPS upload may queue (existing offline logic).
- [ ] **Network recovery** — Driver marker resumes updating.

### Driver telemetry expected

| Event                         | When                                   |
| ----------------------------- | -------------------------------------- |
| `[TrackingV2] mounted`        | `surface: driver`                      |
| `[TrackingV2] map_load`       | Container ready → creating → map_ready |
| `[TrackingV2] resize`         | Post-ready layout                      |
| `[TrackingV2] driver_updated` | Device GPS or DB position              |

---

## Map scenarios (both surfaces)

- [ ] **HMR** — No duplicate maps; cleanup logs on hot reload; canvas non-zero after ready.
- [ ] **Route change** — Leaving `/track` or delivery end destroys map (`unmounted`, `map_remove`).
- [ ] **Component remount** — Single map instance per mount; refs cleared on cleanup.
- [ ] **Fast refresh** — No singleton stale instance; no `MapEngine` involvement.
- [ ] **Window resize** — `resize` telemetry; map fills container.

---

## Debug panel (dev only)

- [ ] **TrackingV2DebugPanel** shows assignment ID, connected, loading, GPS time, coords, map status.
- [ ] Panel does not block map interaction or affect lifecycle.

---

## Pass criteria

All checkboxes pass on:

1. Chrome desktop
2. Mobile Safari or Chrome Android
3. At least one real delivery with live GPS

Record session logs and attach to removal PR.
