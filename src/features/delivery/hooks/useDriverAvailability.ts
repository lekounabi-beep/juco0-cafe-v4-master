/**
 * Driver availability hook
 * Manages driver online/offline status and location updates
 */

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useDriverStore } from '../store/driver-store';
import { getDriverByUserId, updateDriverAvailability, updateDriverLocation } from '@/integrations/supabase/services/driver.service';
import type { DriverAvailability } from '../types/delivery.types';
import type { Coordinates } from '@/shared/types/common.types';

export function useDriverAvailability() {
  const { user } = useAuthStore();
  const { 
    driver, 
    availabilityStatus, 
    currentLocation,
    loading,
    error,
    setDriver, 
    setAvailabilityStatus, 
    setCurrentLocation,
    setLoading,
    setError 
  } = useDriverStore();

  // Load driver profile on mount
  useEffect(() => {
    async function loadDriverProfile() {
      if (!user) return;

      setLoading(true);
      try {
        const driverProfile = await getDriverByUserId(user.id);
        if (driverProfile) {
          setDriver(driverProfile);
          setAvailabilityStatus(driverProfile.availability_status);
          if (driverProfile.current_location_lat && driverProfile.current_location_lng) {
            setCurrentLocation({
              lat: driverProfile.current_location_lat,
              lng: driverProfile.current_location_lng,
            });
          }
        }
      } catch (error) {
        console.error('Failed to load driver profile:', error);
        setError(error instanceof Error ? error.message : 'Failed to load driver profile');
      } finally {
        setLoading(false);
      }
    }

    loadDriverProfile();
  }, [user, setDriver, setAvailabilityStatus, setCurrentLocation, setLoading, setError]);

  // Set driver availability status
  const setAvailability = useCallback(async (status: DriverAvailability, location?: Coordinates) => {
    if (!driver) return;

    setLoading(true);
    try {
      await updateDriverAvailability(driver.id, status, location);
      setAvailabilityStatus(status);
      if (location) {
        setCurrentLocation(location);
      }
    } catch (error) {
      console.error('Failed to update availability:', error);
      setError(error instanceof Error ? error.message : 'Failed to update availability');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [driver, setAvailabilityStatus, setCurrentLocation, setLoading, setError]);

  // Update driver location
  const updateLocation = useCallback(async (location: Coordinates) => {
    if (!driver) return;

    try {
      await updateDriverLocation({
        driver_id: driver.id,
        lat: location.lat,
        lng: location.lng,
      });
      setCurrentLocation(location);
    } catch (error) {
      console.error('Failed to update location:', error);
      setError(error instanceof Error ? error.message : 'Failed to update location');
      throw error;
    }
  }, [driver, setCurrentLocation, setError]);

  // Go online
  const goOnline = useCallback(async (location?: Coordinates) => {
    await setAvailability('online', location);
  }, [setAvailability]);

  // Go offline
  const goOffline = useCallback(async () => {
    await setAvailability('offline');
  }, [setAvailability]);

  // Go busy (when on a delivery)
  const goBusy = useCallback(async () => {
    await setAvailability('busy');
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
    goBusy,
  };
}
