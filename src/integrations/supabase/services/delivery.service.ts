/**
 * Delivery service for Supabase operations
 */

// @ts-nocheck - Supabase types don't include new tables yet

import { supabase } from '@/integrations/supabase/client';
import { driverCreateDeliveryAssignment } from '../../../../app/actions/create-delivery-assignment';
import { fetchDriverActiveDelivery } from '../../../../app/actions/driver-delivery-sync';
import { isUUID } from '@/shared/utils/uuid';
import { devLog } from '@/shared/utils/dev-log';
import type { DeliveryAssignment, DeliveryLocation, OrderWithDelivery, DeliveryStatus, GPSLocationUpdate } from '@/features/delivery/types/delivery.types';
import {
  recordDriverLocationSafe,
  type RecordDriverLocationResult,
} from '@/features/delivery/services/record-driver-location';

export interface CreateDeliveryAssignmentInput {
  order_id: string;
  driver_id: string;
}

function formatSupabaseError(
  error: { message?: string; details?: string; hint?: string; code?: string },
  payload?: Record<string, unknown>
): string {
  devLog.warn('[Delivery Service] Supabase error:', { error, payload });
  const parts = [error.message, error.details, error.hint, error.code ? `(${error.code})` : null].filter(Boolean);
  return parts.join(' — ') || 'Database error';
}

export async function createDeliveryAssignment(
  input: CreateDeliveryAssignmentInput
): Promise<DeliveryAssignment> {
  if (!isUUID(input.order_id)) {
    throw new Error('Invalid order_id: UUID required');
  }
  if (!isUUID(input.driver_id)) {
    throw new Error('Invalid driver_id: UUID required (drivers.id from profile)');
  }

  const result = await driverCreateDeliveryAssignment(input.order_id, input.driver_id);

  if (!result.success || !result.assignment) {
    throw new Error(result.error || 'Failed to create delivery assignment');
  }

  return {
    ...result.assignment,
    status: 'assigned',
  } as DeliveryAssignment;
}

export async function getDeliveryAssignmentByOrderId(orderId: string): Promise<DeliveryAssignment | null> {
  const { data, error } = await supabase
    .from('delivery_assignments' as any)
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error(
      'Supabase fetch error:',
      {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error
      }
    );
    throw new Error(`Failed to fetch delivery assignment: ${error.message}`);
  }

  return data as DeliveryAssignment;
}

export async function getDeliveryAssignmentById(assignmentId: string): Promise<DeliveryAssignment | null> {
  const { data, error } = await supabase
    .from('delivery_assignments' as any)
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error(
      'Supabase fetch error:',
      {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error
      }
    );
    throw new Error(`Failed to fetch delivery assignment: ${error.message}`);
  }

  return data as DeliveryAssignment;
}

export async function acceptDeliveryAssignment(assignmentId: string): Promise<void> {
  if (!isUUID(assignmentId)) {
    throw new Error('Invalid assignment id: UUID required');
  }

  const { error } = await supabase
    .from('delivery_assignments' as any)
    .update({
      accepted_at: new Date().toISOString(),
    })
    .eq('id', assignmentId);

  if (error) {
    throw new Error(formatSupabaseError(error, { assignmentId }));
  }
}

export async function updateDeliveryStatus(
  assignmentId: string,
  status: DeliveryStatus
): Promise<void> {
  const updateData: Record<string, string> = {};

  switch (status) {
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

  const { error } = await supabase
    .from('delivery_assignments' as any)
    .update(updateData)
    .eq('id', assignmentId);

  if (error) {
    console.error(
      'Supabase update error:',
      {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error
      }
    );
    throw new Error(`Failed to update delivery status: ${error.message}`);
  }
}

export async function cancelDeliveryAssignment(
  assignmentId: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase
    .from('delivery_assignments' as any)
    .update({ 
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || null
    })
    .eq('id', assignmentId);

  if (error) {
    console.error(
      'Supabase update error:',
      {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error
      }
    );
    throw new Error(`Failed to cancel delivery assignment: ${error.message}`);
  }
}

export async function getDriverActiveAssignments(driverId: string): Promise<DeliveryAssignment[]> {
  if (!isUUID(driverId)) {
    throw new Error('Invalid driver_id: UUID required');
  }

  const result = await fetchDriverActiveDelivery(driverId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch driver assignments');
  }

  if (!result.assignment) {
    return [];
  }

  return [result.assignment as unknown as DeliveryAssignment];
}

export async function getAvailableOrdersForDrivers(): Promise<OrderWithDelivery[]> {
  const { data, error } = await supabase
    .from('orders' as any)
    .select('*')
    .eq('status', 'ready')
    .eq('delivery_status', 'pending')
    .is('driver_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(
      '[Delivery Service] Failed to fetch available orders:',
      {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error
      }
    );
    throw new Error(formatSupabaseError(error));
  }

  return data as OrderWithDelivery[];
}

export async function recordDriverLocation(
  assignmentId: string,
  driverId: string,
  location: GPSLocationUpdate
): Promise<RecordDriverLocationResult> {
  return recordDriverLocationSafe(assignmentId, driverId, location);
}

export async function getDriverLocationHistory(
  assignmentId: string,
  limit: number = 100
): Promise<DeliveryLocation[]> {
  const { data, error } = await supabase
    .from('delivery_locations' as any)
    .select('*')
    .eq('delivery_assignment_id', assignmentId)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(
      'Supabase fetch error:',
      {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error
      }
    );
    throw new Error(`Failed to fetch location history: ${error.message}`);
  }

  return data as DeliveryLocation[];
}

export async function getLatestDriverLocation(
  assignmentId: string
): Promise<DeliveryLocation | null> {
  const { data, error } = await supabase
    .from('delivery_locations' as any)
    .select('*')
    .eq('delivery_assignment_id', assignmentId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error(
      'Supabase fetch error:',
      {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error
      }
    );
    throw new Error(`Failed to fetch latest location: ${error.message}`);
  }

  return data as DeliveryLocation;
}

export async function cleanupOldLocationHistory(
  assignmentId: string,
  keepLastN: number = 100
): Promise<void> {
  // Get all locations for this assignment
  const { data: allLocations } = await supabase
    .from('delivery_locations' as any)
    .select('id')
    .eq('delivery_assignment_id', assignmentId)
    .order('recorded_at', { ascending: false });

  if (!allLocations || allLocations.length <= keepLastN) {
    return; // No cleanup needed
  }

  // Delete locations beyond the keep limit
  const idsToDelete = allLocations.slice(keepLastN).map((loc: any) => loc.id);

  const { error } = await supabase
    .from('delivery_locations' as any)
    .delete()
    .in('id', idsToDelete);

  if (error) {
    console.error(
      'Supabase delete error:',
      {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error
      }
    );
    throw new Error(`Failed to cleanup old locations: ${error.message}`);
  }
}
