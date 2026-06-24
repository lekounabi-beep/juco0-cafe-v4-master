/**
 * Delivery workflow service
 * Handles all business workflow logic and state transitions
 */

// @ts-nocheck - Supabase types don't include new tables yet

import { supabase } from '@/integrations/supabase/client';
import { devLog } from '@/shared/utils/dev-log';
import type { OrderStatus, DeliveryStatus } from '../types/delivery.types';

// Order status workflow states
export const ORDER_WORKFLOW = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  ARRIVED: 'arrived',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Valid order status transitions
const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['assigned', 'cancelled'],
  assigned: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'cancelled'],
  in_transit: ['arrived', 'cancelled'],
  arrived: ['delivered', 'cancelled'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};

// Delivery status workflow states
export const DELIVERY_WORKFLOW = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  ARRIVED: 'arrived',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

// Valid delivery status transitions
const DELIVERY_STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ['assigned', 'cancelled'],
  assigned: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'cancelled'],
  in_transit: ['arrived', 'cancelled'],
  arrived: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

// Business rules
export const BUSINESS_RULES = {
  // Order rules
  ONLY_READY_ORDERS_CAN_BE_ASSIGNED: 'Only READY orders can be assigned to drivers',
  ONLY_ACCEPTED_ORDERS_CAN_BE_PREPARING: 'Only ACCEPTED orders can be marked as preparing',
  ONLY_PREPARING_ORDERS_CAN_BE_READY: 'Only PREPARING orders can be marked as ready',
  CANCELLED_ORDERS_CANNOT_CHANGE_STATUS: 'Cancelled orders cannot change status',
  COMPLETED_ORDERS_CANNOT_CHANGE_STATUS: 'Completed orders cannot change status',
  
  // Driver rules
  ONLY_ONLINE_DRIVERS_CAN_ACCEPT_ORDERS: 'Only ONLINE drivers can accept orders',
  BUSY_DRIVERS_CANNOT_ACCEPT_ORDERS: 'BUSY drivers cannot accept new orders',
  ASSIGNED_ORDERS_CANNOT_BE_ACCEPTED_BY_OTHER_DRIVERS: 'Assigned orders cannot be accepted by another driver',
  
  // Delivery rules
  ONLY_ASSIGNED_DELIVERIES_CAN_BE_PICKED_UP: 'Only ASSIGNED deliveries can be picked up',
  ONLY_PICKED_UP_DELIVERIES_CAN_BE_IN_TRANSIT: 'Only PICKED_UP deliveries can be in transit',
  ONLY_IN_TRANSIT_DELIVERIES_CAN_BE_ARRIVED: 'Only IN_TRANSIT deliveries can be arrived',
  ONLY_ARRIVED_DELIVERIES_CAN_BE_DELIVERED: 'Only ARRIVED deliveries can be delivered',
};

/**
 * Validate if an order status transition is valid
 */
export function validateOrderStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): { valid: boolean; reason?: string } {
  // Check if transition is allowed
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];
  
  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}. Valid transitions: ${allowedTransitions.join(', ')}`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate if a delivery status transition is valid
 */
export function validateDeliveryStatusTransition(
  currentStatus: DeliveryStatus,
  newStatus: DeliveryStatus
): { valid: boolean; reason?: string } {
  // Check if transition is allowed
  const allowedTransitions = DELIVERY_STATUS_TRANSITIONS[currentStatus];
  
  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}. Valid transitions: ${allowedTransitions.join(', ')}`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate business rule: Only READY orders can be assigned
 */
export function validateOrderCanBeAssigned(orderStatus: OrderStatus): { valid: boolean; reason?: string } {
  if (orderStatus !== 'ready') {
    return {
      valid: false,
      reason: BUSINESS_RULES.ONLY_READY_ORDERS_CAN_BE_ASSIGNED,
    };
  }
  
  return { valid: true };
}

/**
 * Validate business rule: Only ONLINE drivers can accept orders
 */
export function validateDriverCanAcceptOrder(driverAvailability: string): { valid: boolean; reason?: string } {
  if (driverAvailability !== 'online') {
    return {
      valid: false,
      reason: BUSINESS_RULES.ONLY_ONLINE_DRIVERS_CAN_ACCEPT_ORDERS,
    };
  }
  
  return { valid: true };
}

/**
 * Validate business rule: BUSY drivers cannot accept orders
 */
export function validateDriverNotBusy(driverAvailability: string): { valid: boolean; reason?: string } {
  if (driverAvailability === 'busy') {
    return {
      valid: false,
      reason: BUSINESS_RULES.BUSY_DRIVERS_CANNOT_ACCEPT_ORDERS,
    };
  }
  
  return { valid: true };
}

/**
 * Validate business rule: Order is not already assigned
 */
export function validateOrderNotAssigned(driverId: string | null): { valid: boolean; reason?: string } {
  if (driverId !== null) {
    return {
      valid: false,
      reason: BUSINESS_RULES.ASSIGNED_ORDERS_CANNOT_BE_ACCEPTED_BY_OTHER_DRIVERS,
    };
  }
  
  return { valid: true };
}

/**
 * Transition order status with validation
 */
export async function transitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    devLog.log('[Workflow] Transitioning order:', orderId, 'to status:', newStatus);
    
    // Get current order status
    const { data: order, error: fetchError } = await supabase
      .from('orders' as any)
      .select('status, delivery_status, driver_id')
      .eq('id', orderId)
      .single();
    
    if (fetchError) {
      console.error('[Workflow] Failed to fetch order:', fetchError);
      return { success: false, error: `Failed to fetch order: ${fetchError.message}` };
    }
    
    devLog.log('[Workflow] Current order status:', order.status, 'delivery_status:', order.delivery_status, 'driver_id:', order.driver_id);
    
    // Validate transition
    const validation = validateOrderStatusTransition(order.status, newStatus);
    if (!validation.valid) {
      console.error('[Workflow] Invalid transition:', validation.reason);
      return { success: false, error: validation.reason };
    }
    
    // Update order status
    devLog.log('[Workflow] Updating order status to:', newStatus);
    const { error: updateError, count } = await supabase
      .from('orders' as any)
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (updateError) {
      console.error('[Workflow] Failed to update order status:', updateError);
      return { success: false, error: `Failed to update order status: ${updateError.message}` };
    }
    
    devLog.log('[Workflow] Order status updated successfully. Rows affected:', count);
    return { success: true };
  } catch (error) {
    console.error('[Workflow] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Transition delivery status with validation
 */
export async function transitionDeliveryStatus(
  assignmentId: string,
  newStatus: DeliveryStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current delivery assignment status
    const { data: assignment, error: fetchError } = await supabase
      .from('delivery_assignments' as any)
      .select('*')
      .eq('id', assignmentId)
      .single();
    
    if (fetchError) {
      return { success: false, error: `Failed to fetch assignment: ${fetchError.message}` };
    }
    
    // Determine current status from timestamps
    let currentStatus: DeliveryStatus = 'pending';
    if (assignment.delivered_at) currentStatus = 'delivered';
    else if (assignment.arrived_at) currentStatus = 'arrived';
    else if (assignment.started_delivery_at) currentStatus = 'in_transit';
    else if (assignment.picked_up_at) currentStatus = 'picked_up';
    else if (assignment.accepted_at) currentStatus = 'assigned';
    else if (assignment.cancelled_at) currentStatus = 'cancelled';
    
    // Validate transition
    const validation = validateDeliveryStatusTransition(currentStatus, newStatus);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }
    
    const updateData: Record<string, string> = {};

    switch (newStatus) {
      case 'picked_up':
        updateData.picked_up_at = new Date().toISOString();
        break;
      case 'in_transit':
        updateData.started_delivery_at = new Date().toISOString();
        break;
      case 'arrived':
        updateData.arrived_at = new Date().toISOString();
        break;
      case 'delivered':
        updateData.delivered_at = new Date().toISOString();
        break;
      case 'cancelled':
        updateData.cancelled_at = new Date().toISOString();
        break;
    }
    
    const { error: updateError } = await supabase
      .from('delivery_assignments' as any)
      .update(updateData)
      .eq('id', assignmentId);
    
    if (updateError) {
      return { success: false, error: `Failed to update delivery status: ${updateError.message}` };
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Complete workflow validation for order assignment
 */
export async function validateOrderAssignment(
  orderId: string,
  driverId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    // Get order status
    const { data: order, error: orderError } = await supabase
      .from('orders' as any)
      .select('status, driver_id')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      errors.push(`Failed to fetch order: ${orderError.message}`);
      return { valid: false, errors };
    }
    
    // Validate order is ready
    const orderValidation = validateOrderCanBeAssigned(order.status);
    if (!orderValidation.valid) {
      errors.push(orderValidation.reason!);
    }
    
    // Validate order is not already assigned
    const assignmentValidation = validateOrderNotAssigned(order.driver_id);
    if (!assignmentValidation.valid) {
      errors.push(assignmentValidation.reason!);
    }
    
    // Get driver availability
    const { data: driver, error: driverError } = await supabase
      .from('drivers' as any)
      .select('availability_status')
      .eq('id', driverId)
      .single();
    
    if (driverError) {
      errors.push(`Failed to fetch driver: ${driverError.message}`);
      return { valid: false, errors };
    }
    
    // Validate driver is online
    const onlineValidation = validateDriverCanAcceptOrder(driver.availability_status);
    if (!onlineValidation.valid) {
      errors.push(onlineValidation.reason!);
    }
    
    // Validate driver is not busy
    const busyValidation = validateDriverNotBusy(driver.availability_status);
    if (!busyValidation.valid) {
      errors.push(busyValidation.reason!);
    }
    
    return { valid: errors.length === 0, errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    return { valid: false, errors };
  }
}

/**
 * Get workflow state for an order
 */
export async function getOrderWorkflowState(orderId: string) {
  try {
    const { data: order, error } = await supabase
      .from('orders' as any)
      .select('status, delivery_status, driver_id, created_at, updated_at')
      .eq('id', orderId)
      .single();
    
    if (error) {
      throw new Error(`Failed to fetch order: ${error.message}`);
    }
    
    return {
      orderStatus: order.status,
      deliveryStatus: order.delivery_status,
      driverId: order.driver_id,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      canAccept: order.status === 'ready' && order.delivery_status === 'pending',
      canCancel: ['pending', 'accepted', 'preparing', 'ready', 'assigned'].includes(order.status),
      canComplete: order.status === 'completed',
    };
  } catch (error) {
    throw error;
  }
}
