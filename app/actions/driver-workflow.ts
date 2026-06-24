'use server';

import { supabaseAdmin } from '@/integrations/supabase/client.server';
import {
  validateOrderStatusTransition,
  validateDeliveryStatusTransition,
} from '@/features/delivery/services/workflow.service';
import type { OrderStatus, DeliveryStatus } from '@/features/delivery/types/delivery.types';

function assignmentStatusFromRow(assignment: Record<string, string | null>): DeliveryStatus {
  if (assignment.delivered_at) return 'delivered';
  if (assignment.arrived_at) return 'arrived';
  if (assignment.started_delivery_at) return 'in_transit';
  if (assignment.picked_up_at) return 'picked_up';
  if (assignment.accepted_at || assignment.assigned_at) return 'assigned';
  if (assignment.cancelled_at) return 'cancelled';
  return 'pending';
}

export async function driverAssignOrder(
  orderId: string,
  driverId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: order, error } = await supabaseAdmin
    .from('orders' as any)
    .select('status, driver_id')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return { success: false, error: error?.message || 'Order not found' };
  }

  const orderRow = order as { status: string; driver_id: string | null };

  if (orderRow.status === 'assigned' && orderRow.driver_id === driverId) {
    return { success: true };
  }

  if (orderRow.status !== 'ready') {
    return { success: false, error: `Order is ${orderRow.status}, expected ready` };
  }

  const validation = validateOrderStatusTransition(orderRow.status as OrderStatus, 'assigned');
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  const { error: updateError } = await (supabaseAdmin
    .from('orders' as any) as any)
    .update({
      status: 'assigned',
      delivery_status: 'assigned',
      driver_id: driverId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function driverTransitionOrder(
  orderId: string,
  driverId: string,
  newStatus: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  const { data: order, error } = await supabaseAdmin
    .from('orders' as any)
    .select('status, driver_id')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return { success: false, error: error?.message || 'Order not found' };
  }

  const orderRow = order as { status: string; driver_id: string | null };

  if (orderRow.driver_id !== driverId) {
    return { success: false, error: 'Order not assigned to this driver' };
  }

  const validation = validateOrderStatusTransition(orderRow.status as OrderStatus, newStatus);
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  const updatePayload: Record<string, string> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (
    ['assigned', 'picked_up', 'in_transit', 'arrived', 'delivered'].includes(newStatus)
  ) {
    updatePayload.delivery_status = newStatus;
  }

  const { error: updateError } = await (supabaseAdmin
    .from('orders' as any) as any)
    .update(updatePayload)
    .eq('id', orderId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function driverTransitionDelivery(
  assignmentId: string,
  driverId: string,
  newStatus: DeliveryStatus
): Promise<{ success: boolean; error?: string }> {
  const { data: assignment, error } = await supabaseAdmin
    .from('delivery_assignments' as any)
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (error || !assignment) {
    return { success: false, error: error?.message || 'Assignment not found' };
  }

  const assignmentRow = assignment as Record<string, string | null> & { driver_id: string };

  if (assignmentRow.driver_id !== driverId) {
    return { success: false, error: 'Assignment does not belong to this driver' };
  }

  const currentStatus = assignmentStatusFromRow(assignmentRow);
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

  const { error: updateError } = await (supabaseAdmin
    .from('delivery_assignments' as any) as any)
    .update(updateData)
    .eq('id', assignmentId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
