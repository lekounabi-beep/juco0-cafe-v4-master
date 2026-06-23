/**
 * Workflow hook
 * Provides clean API for delivery workflow operations
 */

import { useCallback } from 'react';
import { 
  transitionOrderStatus,
  transitionDeliveryStatus,
  validateOrderAssignment,
  getOrderWorkflowState,
  validateOrderStatusTransition,
  validateDeliveryStatusTransition,
  validateOrderCanBeAssigned,
  validateDriverCanAcceptOrder,
  validateDriverNotBusy,
  validateOrderNotAssigned,
  BUSINESS_RULES
} from '../services/workflow.service';
import type { OrderStatus, DeliveryStatus } from '../types/delivery.types';

export function useWorkflow() {
  /**
   * Transition order status with validation
   */
  const transitionOrder = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    const result = await transitionOrderStatus(orderId, newStatus);
    return result;
  }, []);

  /**
   * Transition delivery status with validation
   */
  const transitionDelivery = useCallback(async (assignmentId: string, newStatus: DeliveryStatus) => {
    const result = await transitionDeliveryStatus(assignmentId, newStatus);
    return result;
  }, []);

  /**
   * Validate order assignment (comprehensive check)
   */
  const validateAssignment = useCallback(async (orderId: string, driverId: string) => {
    const result = await validateOrderAssignment(orderId, driverId);
    return result;
  }, []);

  /**
   * Get workflow state for an order
   */
  const getWorkflowState = useCallback(async (orderId: string) => {
    const state = await getOrderWorkflowState(orderId);
    return state;
  }, []);

  /**
   * Validate order status transition (without executing)
   */
  const canTransitionOrder = useCallback((currentStatus: OrderStatus, newStatus: OrderStatus) => {
    return validateOrderStatusTransition(currentStatus, newStatus);
  }, []);

  /**
   * Validate delivery status transition (without executing)
   */
  const canTransitionDelivery = useCallback((currentStatus: DeliveryStatus, newStatus: DeliveryStatus) => {
    return validateDeliveryStatusTransition(currentStatus, newStatus);
  }, []);

  /**
   * Check if order can be assigned
   */
  const canAssignOrder = useCallback((orderStatus: OrderStatus) => {
    return validateOrderCanBeAssigned(orderStatus);
  }, []);

  /**
   * Check if driver can accept order
   */
  const canDriverAccept = useCallback((driverAvailability: string) => {
    return validateDriverCanAcceptOrder(driverAvailability);
  }, []);

  /**
   * Check if driver is not busy
   */
  const isDriverAvailable = useCallback((driverAvailability: string) => {
    return validateDriverNotBusy(driverAvailability);
  }, []);

  /**
   * Check if order is not already assigned
   */
  const isOrderUnassigned = useCallback((driverId: string | null) => {
    return validateOrderNotAssigned(driverId);
  }, []);

  return {
    transitionOrder,
    transitionDelivery,
    validateAssignment,
    getWorkflowState,
    canTransitionOrder,
    canTransitionDelivery,
    canAssignOrder,
    canDriverAccept,
    isDriverAvailable,
    isOrderUnassigned,
    businessRules: BUSINESS_RULES,
  };
}
