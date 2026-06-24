/**
 * Driver availability hook
 * Manages driver online/offline status and location updates
 */

import { useCallback } from 'react';
import { useDriverStore } from '../store/driver-store';
import { updateDriverAvailability, updateDriverLocation } from '@/integrations/supabase/services/driver.service';
import type { DriverAvailability } from '../types/delivery.types';
import type { Coordinates } from '@/shared/types/common.types';

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

      setLoading(true);
      try {
        await updateDriverAvailability(driver.id, status, location);
        setAvailabilityStatus(status);
        if (location) {
          setCurrentLocation(location);
        }
      } catch (err) {
        console.error('Failed to update availability:', err);
        setError(err instanceof Error ? err.message : 'Failed to update availability');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [driver, setAvailabilityStatus, setCurrentLocation, setLoading, setError]
  );

  const updateLocation = useCallback(
    async (location: Coordinates) => {
      if (!driver) return;

      try {
        await updateDriverLocation({
          driver_id: driver.id,
          lat: location.lat,
          lng: location.lng,
        });
        setCurrentLocation(location);
      } catch (err) {
        console.error('Failed to update location:', err);
        setError(err instanceof Error ? err.message : 'Failed to update location');
        throw err;
      }
    },
    [driver, setCurrentLocation, setError]
  );

  const goOnline = useCallback(async (location?: Coordinates) => {
    await setAvailability('online', location);
  }, [setAvailability]);

  const goOffline = useCallback(async () => {
    await setAvailability('offline');
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
