"use client";

import { useEffect, useMemo } from "react";
import { jucoCafeMapCoordinates } from "@/features/maps/juco-cafe-mapbox-marker";
import { useOrderDestination } from "@/features/delivery/hooks/useOrderDestination";
import type { SuperAdminFleetDriverDetails } from "@/features/superadmin/types/superadmin-fleet.types";
import { isValidLatLng, normalizeCoordinates } from "@/shared/utils/coordinates";
import type { Coordinates } from "@/shared/types/common.types";

function resolveFleetDriverLocation(
  driver: SuperAdminFleetDriverDetails | null,
): Coordinates | undefined {
  if (!driver) return undefined;

  const fromResolved = normalizeCoordinates(driver.location);
  if (fromResolved) return fromResolved;

  return (
    normalizeCoordinates({
      lat: driver.current_location_lat,
      lng: driver.current_location_lng,
    }) ?? undefined
  );
}

export function useFleetMapCoordinates(driver: SuperAdminFleetDriverDetails | null) {
  const orderForDestination = useMemo(() => {
    const delivery = driver?.active_delivery;
    if (!delivery) return null;

    return {
      id: delivery.order_id,
      address: delivery.address,
      lat: delivery.destination_lat,
      lng: delivery.destination_lng,
    };
  }, [driver?.active_delivery]);

  const { destination: resolvedDestination, resolving: destinationResolving } =
    useOrderDestination(orderForDestination);

  const driverLocation = useMemo(() => resolveFleetDriverLocation(driver), [driver]);

  const destination = resolvedDestination;

  const cafePoint = jucoCafeMapCoordinates();

  const markerCount = [driverLocation, destination, cafePoint].filter((point) =>
    isValidLatLng(point),
  ).length;

  const hasMapContent = isValidLatLng(driverLocation) || isValidLatLng(destination);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !driver) return;

    console.info("[FleetMap] marker coordinates", {
      driverId: driver.id,
      driver: driverLocation ?? null,
      destination: destination ?? null,
      store: cafePoint,
      markerCount,
      destinationResolving,
    });
  }, [
    driver,
    driver?.id,
    driverLocation,
    destination,
    cafePoint,
    markerCount,
    destinationResolving,
  ]);

  return {
    driverLocation,
    destination,
    destinationResolving,
    markerCount,
    hasMapContent,
  };
}
