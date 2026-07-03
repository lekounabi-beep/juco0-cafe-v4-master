/**
 * useDeliveryState — wires Supabase inputs into computeDeliveryState.
 * All roles MUST use this (or computeDeliveryState directly) for delivery truth.
 */

"use client";

import { useEffect, useMemo } from "react";
import { computeDeliveryState } from "@/features/delivery/core/compute-delivery-state";
import { forensicCoord, forensicLog } from "@/features/maps/debug/map-forensic-logger";
import { useCanonicalDeliveryLocations } from "@/features/delivery/core/use-canonical-delivery-locations";
import type {
  ComputedDeliveryState,
  DeliveryStateAssignment,
  DeliveryStateOrder,
  DeliveryStateRole,
} from "@/features/delivery/core/delivery-state.types";
import type { Coordinates } from "@/shared/types/common.types";
import { isUUID } from "@/shared/utils/uuid";

export function useDeliveryState({
  order,
  assignment,
  role = "customer",
  storeLocation = null,
}: {
  order?: DeliveryStateOrder;
  assignment?: DeliveryStateAssignment;
  role?: DeliveryStateRole;
  storeLocation?: Coordinates | null;
}): {
  deliveryState: ComputedDeliveryState;
  locationDebug: {
    realtimeConnected: boolean;
    lastGpsAgeMs: number | null;
    locationCount: number;
  };
} {
  const assignmentId = assignment?.id && isUUID(assignment.id) ? assignment.id : null;
  const orderId =
    order && typeof order === "object" && "id" in order && typeof order.id === "string"
      ? order.id
      : null;
  const { locations, debug } = useCanonicalDeliveryLocations(assignmentId, {
    orderId: role === "customer" ? orderId : null,
    driverMode: role === "driver",
  });

  const deliveryState = useMemo(
    () =>
      computeDeliveryState({
        order,
        assignment,
        locations,
        role,
        storeLocation,
      }),
    [order, assignment, locations, role, storeLocation],
  );

  useEffect(() => {
    if (role !== "customer") return;
    const pos = deliveryState.driverPosition;
    const dest = deliveryState.destination;
    forensicLog("customer", "delivery_state", "driver_position_db_only", {
      customerStep: deliveryState.customerStep,
      deliveryStatus: deliveryState.deliveryStatus,
      driver: forensicCoord(pos?.lat, pos?.lng),
      dest: forensicCoord(dest?.lat, dest?.lng),
      routePts: deliveryState.routePoints.length,
    });
  }, [
    role,
    deliveryState.customerStep,
    deliveryState.deliveryStatus,
    deliveryState.driverPosition,
    deliveryState.destination,
    deliveryState.routePoints.length,
  ]);

  return { deliveryState, locationDebug: debug };
}
