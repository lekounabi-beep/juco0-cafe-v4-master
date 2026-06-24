'use server';

import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { isUUID } from '@/shared/utils/uuid';
import { validateOrderStatusTransition } from '@/features/delivery/services/workflow.service';
import { fetchDriverActiveDelivery } from './driver-delivery-sync';
import type { OrderStatus } from '@/features/delivery/types/delivery.types';

type AssignmentRow = {
  id: string;
  order_id: string;
  driver_id: string;
  assigned_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  started_delivery_at: string | null;
  arrived_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
};

export type DriverAcceptOrderResult = {
  success: boolean;
  assignment?: AssignmentRow;
  error?: string;
  /** Present when driver already has a different active delivery — client should sync UI */
  syncAssignment?: AssignmentRow;
};

function formatDbError(error: { message?: string; details?: string; hint?: string; code?: string }): string {
  return [error.message, error.details, error.hint].filter(Boolean).join(' — ') || 'Database error';
}

function logDev(payload: unknown, error?: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.error('[driverAcceptOrder]', payload, error);
  }
}

async function setDriverBusy(driverId: string): Promise<void> {
  const { error } = await (supabaseAdmin.from('drivers' as any) as any)
    .update({
      availability_status: 'busy',
      updated_at: new Date().toISOString(),
    })
    .eq('id', driverId);

  if (error) {
    logDev({ driverId, step: 'setDriverBusy' }, error);
  }
}

async function assignOrderToDriver(orderId: string, driverId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: order, error } = await supabaseAdmin
    .from('orders' as any)
    .select('status, driver_id, delivery_status')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return { ok: false, error: error?.message || 'Order not found' };
  }

  const row = order as { status: string; driver_id: string | null; delivery_status: string };

  if (row.status === 'assigned' && row.driver_id === driverId) {
    return { ok: true };
  }

  if (row.status !== 'ready') {
    return { ok: false, error: `Order is ${row.status}, expected ready` };
  }

  const validation = validateOrderStatusTransition(row.status as OrderStatus, 'assigned');
  if (!validation.valid) {
    return { ok: false, error: validation.reason };
  }

  const { error: updateError } = await (supabaseAdmin.from('orders' as any) as any)
    .update({
      status: 'assigned',
      delivery_status: 'assigned',
      driver_id: driverId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) {
    return { ok: false, error: formatDbError(updateError) };
  }

  return { ok: true };
}

/**
 * Atomic driver accept: creates assignment + assigns order + sets driver BUSY.
 * Uses service role — safe for device-login drivers without Supabase auth session.
 */
export async function driverAcceptOrder(
  orderId: string,
  driverId: string
): Promise<DriverAcceptOrderResult> {
  if (!isUUID(orderId)) {
    return { success: false, error: 'Invalid order_id: UUID required' };
  }
  if (!isUUID(driverId)) {
    return { success: false, error: 'Invalid driver_id: UUID required (drivers.id from profile)' };
  }

  const { data: driver, error: driverError } = await supabaseAdmin
    .from('drivers' as any)
    .select('id, is_active')
    .eq('id', driverId)
    .single();

  if (driverError || !driver) {
    return { success: false, error: driverError?.message || 'Driver not found' };
  }

  if ((driver as { is_active?: boolean }).is_active === false) {
    return { success: false, error: 'Driver is not active' };
  }

  const { data: activeAssignments, error: activeError } = await supabaseAdmin
    .from('delivery_assignments' as any)
    .select('id, order_id')
    .eq('driver_id', driverId)
    .is('delivered_at', null)
    .is('cancelled_at', null);

  if (activeError) {
    return { success: false, error: formatDbError(activeError) };
  }

  const active = (activeAssignments ?? []) as { id: string; order_id: string }[];
  const activeOther = active.find((a) => a.order_id !== orderId);
  if (activeOther) {
    const syncResult = await fetchDriverActiveDelivery(driverId);
    if (syncResult.success && syncResult.assignment) {
      return {
        success: false,
        error: 'Driver already has an active delivery',
        syncAssignment: syncResult.assignment as AssignmentRow,
      };
    }
    return { success: false, error: 'Driver already has an active delivery' };
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('delivery_assignments' as any)
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: formatDbError(existingError) };
  }

  if (existing) {
    const row = existing as AssignmentRow;
    if (row.driver_id !== driverId) {
      return { success: false, error: 'Order already assigned to another driver' };
    }

    const assignOrder = await assignOrderToDriver(orderId, driverId);
    if (!assignOrder.ok) {
      return { success: false, error: assignOrder.error };
    }

    if (!row.accepted_at) {
      const now = new Date().toISOString();
      await (supabaseAdmin.from('delivery_assignments' as any) as any)
        .update({ accepted_at: now })
        .eq('id', row.id);
      row.accepted_at = now;
    }

    await setDriverBusy(driverId);
    return { success: true, assignment: row };
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders' as any)
    .select('status, driver_id, delivery_status')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: orderError?.message || 'Order not found' };
  }

  const orderRow = order as { status: string; driver_id: string | null };
  const canAccept =
    orderRow.status === 'ready' ||
    (orderRow.status === 'assigned' && orderRow.driver_id === driverId);

  if (!canAccept) {
    return {
      success: false,
      error: `Order is ${orderRow.status}, cannot accept`,
    };
  }

  const now = new Date().toISOString();
  const insertPayload = {
    order_id: orderId,
    driver_id: driverId,
    assigned_at: now,
    accepted_at: now,
  };

  const { data: assignment, error: insertError } = await (supabaseAdmin
    .from('delivery_assignments' as any) as any)
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError || !assignment) {
    logDev({ insertPayload, step: 'insert' }, insertError);
    return {
      success: false,
      error: insertError ? formatDbError(insertError) : 'Failed to create assignment',
    };
  }

  const assignOrder = await assignOrderToDriver(orderId, driverId);
  if (!assignOrder.ok) {
    await supabaseAdmin.from('delivery_assignments' as any).delete().eq('id', (assignment as AssignmentRow).id);
    return { success: false, error: assignOrder.error };
  }

  await setDriverBusy(driverId);

  return { success: true, assignment: assignment as AssignmentRow };
}

/**
 * Service-role insert only — prefer driverAcceptOrder for the full accept flow.
 */
export async function driverCreateDeliveryAssignment(
  orderId: string,
  driverId: string
): Promise<DriverAcceptOrderResult> {
  return driverAcceptOrder(orderId, driverId);
}
