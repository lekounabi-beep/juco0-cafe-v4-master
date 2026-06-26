/**
 * Driver availability hook
 * Manages driver online/offline status and location updates
 */

import { useCallback } from "react";
import { useDriverStore } from "../store/driver-store";
import { updateDriverAvailabilityServer } from "../../../../app/actions/driver-availability";
import { isNetworkOnline } from "../services/offline-queue.service";
import { withTimeout } from "@/shared/utils/with-timeout";
import type { DriverAvailability } from "../types/delivery.types";
import type { Coordinates } from "@/shared/types/common.types";

const AVAILABILITY_TIMEOUT_MS = 8_000;

export function useDriverAvailability() {
  const {
    driver,
    availabilityStatus,
    currentLocation,
    loading,
    error,
    setAvailabilityStatus,
    setCurrentLocation,
    setLoading,
    setError,
  } = useDriverStore();

  const setAvailability = useCallback(
    async (status: DriverAvailability, location?: Coordinates) => {
      if (!driver) return;

      if (!isNetworkOnline()) {
        setAvailabilityStatus(status);
        if (location) setCurrentLocation(location);
        return;
      }

      setLoading(true);
      try {
        const result = await withTimeout(
          updateDriverAvailabilityServer(driver.id, status, location),
          AVAILABILITY_TIMEOUT_MS,
          "availability_timeout",
        );
        if (!result.success) {
          throw new Error(result.error ?? "Failed to update availability");
        }
        setAvailabilityStatus(status);
        if (location) {
          setCurrentLocation(location);
        }
      } catch (err) {
        console.warn("Availability update deferred (offline/slow):", err);
        setAvailabilityStatus(status);
        if (location) {
          setCurrentLocation(location);
        }
      } finally {
        setLoading(false);
      }
    },
    [driver, setAvailabilityStatus, setCurrentLocation, setLoading, setError],
  );

  const updateLocation = useCallback(
    async (location: Coordinates) => {
      if (!driver) return;
      if (!isNetworkOnline()) {
        setCurrentLocation(location);
        return;
      }

      try {
        const result = await withTimeout(
          updateDriverAvailabilityServer(driver.id, availabilityStatus, location),
          AVAILABILITY_TIMEOUT_MS,
          "location_timeout",
        );
        if (!result.success) {
          throw new Error(result.error ?? "Failed to update location");
        }
        setCurrentLocation(location);
      } catch (err) {
        console.warn("Location update deferred (offline/slow):", err);
        setCurrentLocation(location);
      }
    },
    [driver, setCurrentLocation, setError],
  );

  const goOnline = useCallback(
    async (location?: Coordinates) => {
      await setAvailability("online", location);
    },
    [setAvailability],
  );

  const goOffline = useCallback(async () => {
    await setAvailability("offline");
  }, [setAvailability]);

  return {
    driver,
    availabilityStatus,
    currentLocation,
    loading,
    error,
    setAvailability,
    updateLocation,
    goOnline,
    goOffline,
  };
}
