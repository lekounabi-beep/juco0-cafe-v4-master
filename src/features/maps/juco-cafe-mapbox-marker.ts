import type mapboxgl from "mapbox-gl";
import { JUCO_CAFE_LOCATION } from "@/config/juco-cafe-location";
import {
  DELIVERY_VENUE_MARKER_GREEN,
  JUCO_CAFE_MARKER_ICON_PX,
  JUCO_CAFE_MARKER_RING,
  JUCO_CAFE_MARKER_RING_PX,
  JUCO_CAFE_MARKER_SIZE_PX,
  storefrontMarkerIconSvg,
} from "@/features/maps/icons/checkout-fulfillment-icons";

type MapboxModule = typeof import("mapbox-gl");

export function createJucoCafeMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-label", JUCO_CAFE_LOCATION.name);
  el.style.cursor = "pointer";
  el.dataset.markerKind = "juco-cafe-store";
  const iconSvg = storefrontMarkerIconSvg({
    stroke: "#ffffff",
    size: JUCO_CAFE_MARKER_ICON_PX,
    strokeWidth: 1.8,
  });
  el.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${JUCO_CAFE_MARKER_SIZE_PX}px;
      height: ${JUCO_CAFE_MARKER_SIZE_PX}px;
      border-radius: 50%;
      background: ${DELIVERY_VENUE_MARKER_GREEN};
      border: ${JUCO_CAFE_MARKER_RING_PX}px solid ${JUCO_CAFE_MARKER_RING};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0, 0, 0, 0.06);
    ">
      ${iconSvg}
    </div>
  `;
  return el;
}

export function jucoCafeMapCoordinates(): { lat: number; lng: number } {
  return {
    lat: JUCO_CAFE_LOCATION.latitude,
    lng: JUCO_CAFE_LOCATION.longitude,
  };
}

export function createJucoCafePopup(mapbox: MapboxModule): mapboxgl.Popup {
  return new mapbox.default.Popup({
    offset: 24,
    closeButton: true,
    closeOnClick: true,
    maxWidth: "240px",
  }).setHTML(`
    <div style="font-family: system-ui, sans-serif; line-height: 1.35;">
      <div style="font-weight: 600; font-size: 14px; color: #111827;">${JUCO_CAFE_LOCATION.name}</div>
      <div style="margin-top: 2px; font-size: 12px; color: #4b5563;">Παραλαβή από το κατάστημα</div>
    </div>
  `);
}

/** Permanent café landmark — attach once per map instance; only remove on map teardown. */
export function attachJucoCafeMarker(map: mapboxgl.Map, mapbox: MapboxModule): mapboxgl.Marker {
  const coords = jucoCafeMapCoordinates();

  return new mapbox.default.Marker({
    element: createJucoCafeMarkerElement(),
    anchor: "center",
  })
    .setLngLat([coords.lng, coords.lat])
    .setPopup(createJucoCafePopup(mapbox))
    .addTo(map);
}
