/**
 * Driver profile hook
 * Manages driver profile operations
 */

import { useCallback } from 'react';
import { useDriverStore } from '../store/driver-store';
import { getDriverByUserId, updateDriverRating, deactivateDriver } from '@/integrations/supabase/services/driver.service';
import type { DriverProfile } from '../types/delivery.types';

export function useDriverProfile() {
  const { driver, setDriver, setLoading, setError } = useDriverStore();

  // Refresh driver profile from database
  const refreshProfile = useCallback(async (): Promise<DriverProfile | null> => {
    if (!driver) {
      throw new Error('Driver not authenticated');
    }

    setLoading(true);
    try {
      const updatedProfile = await getDriverByUserId(driver.user_id);
      if (updatedProfile) {
        setDriver(updatedProfile);
      }
      return updatedProfile;
    } catch (error) {
      console.error('Failed to refresh driver profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh driver profile');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [driver, setDriver, setLoading, setError]);

  // Update driver rating
  const updateRating = useCallback(async (rating: number): Promise<void> => {
    if (!driver) {
      throw new Error('Driver not authenticated');
    }

    if (rating < 0 || rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }

    try {
      await updateDriverRating(driver.id, rating);
      // Refresh profile to get updated rating
      await refreshProfile();
    } catch (error) {
      console.error('Failed to update driver rating:', error);
      setError(error instanceof Error ? error.message : 'Failed to update driver rating');
      throw error;
    }
  }, [driver, refreshProfile, setError]);

  // Deactivate driver account
  const deactivateAccount = useCallback(async (): Promise<void> => {
    if (!driver) {
      throw new Error('Driver not authenticated');
    }

    try {
      await deactivateDriver(driver.id);
      // Refresh profile to get updated status
      await refreshProfile();
    } catch (error) {
      console.error('Failed to deactivate driver account:', error);
      setError(error instanceof Error ? error.message : 'Failed to deactivate driver account');
      throw error;
    }
  }, [driver, refreshProfile, setError]);

  // Check if driver is currently on a delivery
  const isOnDelivery = useCallback((): boolean => {
    return driver?.availability_status === 'busy' || false;
  }, [driver]);

  // Check if driver is available for new orders
  const isAvailable = useCallback((): boolean => {
    return driver?.availability_status === 'online' && driver?.is_active === true;
  }, [driver]);

  // Get driver performance metrics
  const getPerformanceMetrics = useCallback(() => {
    if (!driver) {
      return null;
    }

    return {
      totalDeliveries: driver.total_deliveries,
      rating: driver.rating,
      isActive: driver.is_active,
      vehicleType: driver.vehicle_type,
    };
  }, [driver]);

  return {
    driver,
    refreshProfile,
    updateRating,
    deactivateAccount,
    isOnDelivery,
    isAvailable,
    getPerformanceMetrics,
  };
}
