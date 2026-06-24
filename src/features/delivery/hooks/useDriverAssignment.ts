/**
 * Driver assignment hook (legacy — prefer acceptOrderWithOffline + useDriverPage)
 */

import { useCallback } from 'react';
import { useDriverStore } from '../store/driver-store';
import {
  updateDeliveryStatus,
  getAvailableOrdersForDrivers,
  getDriverActiveAssignments,
  getDeliveryAssignmentByOrderId,
} from '@/integrations/supabase/services/delivery.service';
import { driverAcceptOrder } from '../../../../app/actions/create-delivery-assignment';
import { isUUID } from '@/shared/utils/uuid';
import type { OrderWithDelivery, DeliveryAssignment } from '../types/delivery.types';

export function useDriverAssignment() {
  const { driver } = useDriverStore();

  const acceptOrder = useCallback(async (orderId: string): Promise<DeliveryAssignment> => {
    if (!driver) {
      throw new Error('Driver not authenticated');
    }
    if (!isUUID(driver.id)) {
      throw new Error('Invalid driver_id: UUID required');
    }
    if (!isUUID(orderId)) {
      throw new Error('Invalid order_id: UUID required');
    }

    const result = await driverAcceptOrder(orderId, driver.id);
    if (!result.success || !result.assignment) {
      throw new Error(result.error || 'Failed to accept order');
    }

    return {
      ...result.assignment,
      status: 'assigned',
    } as unknown as DeliveryAssignment;
  }, [driver]);

  const getAvailableOrders = useCallback(async (): Promise<OrderWithDelivery[]> => {
    try {
      return await getAvailableOrdersForDrivers();
    } catch (error) {
      console.error('Failed to fetch available orders:', error);
      throw error;
    }
  }, []);

  const getActiveAssignments = useCallback(async (): Promise<DeliveryAssignment[]> => {
    if (!driver) {
      throw new Error('Driver not authenticated');
    }

    try {
      return await getDriverActiveAssignments(driver.id);
    } catch (error) {
      console.error('Failed to fetch active assignments:', error);
      throw error;
    }
  }, [driver]);

  const updateStatus = useCallback(async (assignmentId: string, status: 'picked_up' | 'in_transit' | 'arrived' | 'delivered'): Promise<void> => {
    try {
      await updateDeliveryStatus(assignmentId, status);
    } catch (error) {
      console.error('Failed to update delivery status:', error);
      throw error;
    }
  }, []);

  const pickUpOrder = useCallback(async (assignmentId: string): Promise<void> => {
    await updateStatus(assignmentId, 'picked_up');
  }, [updateStatus]);

  const startDelivery = useCallback(async (assignmentId: string): Promise<void> => {
    await updateStatus(assignmentId, 'in_transit');
  }, [updateStatus]);

  const arriveAtCustomer = useCallback(async (assignmentId: string): Promise<void> => {
    await updateStatus(assignmentId, 'arrived');
  }, [updateStatus]);

  const completeDelivery = useCallback(async (assignmentId: string): Promise<void> => {
    await updateStatus(assignmentId, 'delivered');
  }, [updateStatus]);

  const getOrderAssignment = useCallback(async (orderId: string): Promise<DeliveryAssignment | null> => {
    try {
      return await getDeliveryAssignmentByOrderId(orderId);
    } catch (error) {
      console.error('Failed to fetch order assignment:', error);
      throw error;
    }
  }, []);

  return {
    driver,
    acceptOrder,
    getAvailableOrders,
    getActiveAssignments,
    pickUpOrder,
    startDelivery,
    arriveAtCustomer,
    completeDelivery,
    getOrderAssignment,
  };
}
