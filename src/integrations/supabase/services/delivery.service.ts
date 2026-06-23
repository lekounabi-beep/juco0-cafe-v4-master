/**
 * Delivery service for Supabase operations
 */

// @ts-nocheck - Supabase types don't include new tables yet

import { supabase } from '@/integrations/supabase/client';
import type { DeliveryAssignment, DeliveryLocation, OrderWithDelivery, DeliveryStatus, GPSLocationUpdate } from '@/features/delivery/types/delivery.types';

export interface CreateDeliveryAssignmentInput {
  order_id: string;
  driver_id: string;
}

export async function createDeliveryAssignment(
  input: CreateDeliveryAssignmentInput
): Promise<DeliveryAssignment> {
  console.log('[DELIVERY SERVICE] createDeliveryAssignment called with:', input);
  const payload = {
    order_id: input.order_id,
    driver_id: input.driver_id,
    assigned_at: new Date().toISOString(),
  };
  console.log('[DELIVERY SERVICE] Payload:', payload);

  // First, update the orders table to set driver_id and change status
  console.log('[DELIVERY SERVICE] Updating orders table...');
  const { error: orderUpdateError } = await supabase
    .from('orders' as any)
    .update({
      driver_id: input.driver_id,
      status: 'assigned',
      delivery_status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.order_id);

  if (orderUpdateError) {
    console.error('[DELIVERY SERVICE] Failed to update orders table:', orderUpdateError);
    throw new Error(`Failed to update order: ${orderUpdateError.message}`);
  }
  console.log('[DELIVERY SERVICE] Orders table updated successfully');

  // Then, create the delivery assignment
  const { data, error } = await supabase
    .from('delivery_assignments' as any)
    .insert(payload)
    .select('*')
    .single();

  console.log('[DELIVERY SERVICE] Insert result - data:', data, 'error:', error);

  if (error) {
    console.error(
      '[DELIVERY SERVICE] Supabase insert error:',
      {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error
      }
    );
    throw new Error(`Failed to create delivery assignment: ${error.message}`);
  }

  console.log('[DELIVERY SERVICE] Returning assignment:', data);
  return data as DeliveryAssignment;
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
  console.log('[DELIVERY SERVICE] acceptDeliveryAssignment called with assignmentId:', assignmentId);
  const { error } = await supabase
    .from('delivery_assignments' as any)
    .update({
      accepted_at: new Date().toISOString()
    })
    .eq('id', assignmentId);

  console.log('[DELIVERY SERVICE] Accept result - error:', error);

  if (error) {
    console.error(
      '[DELIVERY SERVICE] Supabase update error:',
      {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error
      }
    );
    throw new Error(`Failed to accept delivery assignment: ${error.message}`);
  }

  console.log('[DELIVERY SERVICE] Assignment accepted successfully');
}

export async function updateDeliveryStatus(
  assignmentId: string,
  status: DeliveryStatus
): Promise<void> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

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
  const { data, error } = await supabase
    .from('delivery_assignments' as any)
    .select('*')
    .eq('driver_id', driverId)
    .is('delivered_at', null)
    .is('cancelled_at', null)
    .order('assigned_at', { ascending: false });

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
    throw new Error(`Failed to fetch driver assignments: ${error.message}`);
  }

  return data as DeliveryAssignment[];
}

export async function getAvailableOrdersForDrivers(): Promise<OrderWithDelivery[]> {
  console.log('[Delivery Service] Fetching available orders for drivers...');
  
  // Check auth session
  const { data: { session } } = await supabase.auth.getSession();
  console.log('[Delivery Service] Auth session:', session ? 'exists' : 'null');
  console.log('[Delivery Service] User ID:', session?.user?.id);
  
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
    throw new Error(`Failed to fetch available orders: ${error.message}`);
  }

  console.log('[Delivery Service] Available orders fetched:', data.length, 'orders');
  console.log('[Delivery Service] Orders:', data);
  return data as OrderWithDelivery[];
}

export async function recordDriverLocation(
  assignmentId: string,
  driverId: string,
  location: GPSLocationUpdate
): Promise<void> {
  const payload = {
    delivery_assignment_id: assignmentId,
    driver_id: driverId,
    lat: location.lat,
    lng: location.lng,
    accuracy: location.accuracy || null,
    speed: location.speed || null,
    heading: location.heading || null,
    recorded_at: location.timestamp || new Date().toISOString(),
  };

  const { error } = await supabase
    .from('delivery_locations' as any)
    .insert(payload);

  if (error) {
    console.error(
      'Supabase insert error:',
      {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error
      }
    );
    throw new Error(`Failed to record driver location: ${error.message}`);
  }
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
