/**
 * Driver assignment hook
 * Manages driver self-assignment logic for available orders
 */

import { useCallback } from 'react';
import { useDriverStore } from '../store/driver-store';
import { 
  createDeliveryAssignment, 
  acceptDeliveryAssignment,
  updateDeliveryStatus,
  getAvailableOrdersForDrivers,
  getDriverActiveAssignments,
  getDeliveryAssignmentByOrderId
} from '@/integrations/supabase/services/delivery.service';
import type { OrderWithDelivery, DeliveryAssignment } from '../types/delivery.types';

export function useDriverAssignment() {
  const { driver } = useDriverStore();

  // Accept an available order (self-assign)
  const acceptOrder = useCallback(async (orderId: string): Promise<DeliveryAssignment> => {
    console.log('[ACCEPT ORDER FLOW] Starting acceptOrder for orderId:', orderId);
    console.log('[ACCEPT ORDER FLOW] Driver:', driver);

    if (!driver) {
      console.error('[ACCEPT ORDER FLOW] ERROR: Driver not authenticated');
      throw new Error('Driver not authenticated');
    }

    try {
      console.log('[ACCEPT ORDER FLOW] Checking if assignment already exists...');
      // Check if assignment already exists
      const existingAssignment = await getDeliveryAssignmentByOrderId(orderId);
      console.log('[ACCEPT ORDER FLOW] Existing assignment:', existingAssignment);
      if (existingAssignment) {
        console.log('[ACCEPT ORDER FLOW] Assignment already exists for order:', orderId);
        return existingAssignment;
      }

      console.log('[ACCEPT ORDER FLOW] Creating delivery assignment...');
      // Create delivery assignment
      const assignment = await createDeliveryAssignment({
        order_id: orderId,
        driver_id: driver.id,
      });
      console.log('[ACCEPT ORDER FLOW] Delivery assignment created:', assignment);

      console.log('[ACCEPT ORDER FLOW] Accepting the assignment...');
      // Accept the assignment
      await acceptDeliveryAssignment(assignment.id);
      console.log('[ACCEPT ORDER FLOW] Assignment accepted');

      console.log('[ACCEPT ORDER FLOW] Returning assignment:', assignment);
      return assignment;
    } catch (error) {
      console.error('[ACCEPT ORDER FLOW] Failed to accept order:', error);
      throw error;
    }
  }, [driver]);

  // Get available orders for drivers (READY orders without driver)
  const getAvailableOrders = useCallback(async (): Promise<OrderWithDelivery[]> => {
    try {
      console.log('[useDriverAssignment] Calling getAvailableOrdersForDrivers...');
      const orders = await getAvailableOrdersForDrivers();
      console.log('[useDriverAssignment] Orders fetched:', orders.length, 'orders');
      return orders;
    } catch (error) {
      console.error('[useDriverAssignment] Failed to fetch available orders:', error);
      throw error;
    }
  }, []);

  // Get driver's active assignments
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

  // Update delivery status (pick up, start delivery, arrive, deliver)
  const updateStatus = useCallback(async (assignmentId: string, status: 'picked_up' | 'in_transit' | 'arrived' | 'delivered'): Promise<void> => {
    try {
      await updateDeliveryStatus(assignmentId, status);
    } catch (error) {
      console.error('Failed to update delivery status:', error);
      throw error;
    }
  }, []);

  // Pick up order
  const pickUpOrder = useCallback(async (assignmentId: string): Promise<void> => {
    await updateStatus(assignmentId, 'picked_up');
  }, [updateStatus]);

  // Start delivery
  const startDelivery = useCallback(async (assignmentId: string): Promise<void> => {
    await updateStatus(assignmentId, 'in_transit');
  }, [updateStatus]);

  // Arrive at customer location
  const arriveAtCustomer = useCallback(async (assignmentId: string): Promise<void> => {
    await updateStatus(assignmentId, 'arrived');
  }, [updateStatus]);

  // Complete delivery
  const completeDelivery = useCallback(async (assignmentId: string): Promise<void> => {
    await updateStatus(assignmentId, 'delivered');
  }, [updateStatus]);

  // Get assignment for a specific order
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
