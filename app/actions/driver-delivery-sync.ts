'use server';

import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { isUUID } from '@/shared/utils/uuid';
import { assignmentStatusFromTimestamps } from '@/shared/utils/order-fields';

export type DriverActiveDeliveryPayload = {
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
  cancellation_reason?: string | null;
  status: string;
  order?: {
    id: string;
    order_number: string;
    status: string;
    items: { name: string; qty: number }[];
    total: number;
    address: string;
    lat?: number | null;
    lng?: number | null;
    created_at: string;
  };
};

export type FetchDriverActiveDeliveryResult = {
  success: boolean;
  assignment: DriverActiveDeliveryPayload | null;
  error?: string;
};

function formatDbError(error: { message?: string; details?: string; hint?: string }): string {
  return [error.message, error.details, error.hint].filter(Boolean).join(' — ') || 'Database error';
}

/**
 * Authoritative active delivery fetch (service role).
 * Device-login drivers have no Supabase auth session — client RLS queries return empty.
 */
export async function fetchDriverActiveDelivery(
  driverId: string
): Promise<FetchDriverActiveDeliveryResult> {
  if (!isUUID(driverId)) {
    return { success: false, assignment: null, error: 'Invalid driver_id: UUID required' };
  }

  const { data: rows, error } = await supabaseAdmin
    .from('delivery_assignments' as any)
    .select('*')
    .eq('driver_id', driverId)
    .is('delivered_at', null)
    .is('cancelled_at', null)
    .order('assigned_at', { ascending: false })
    .limit(1);

  if (error) {
    return { success: false, assignment: null, error: formatDbError(error) };
  }

  const list = (rows ?? []) as Record<string, unknown>[];
  if (list.length === 0) {
    return { success: true, assignment: null };
  }

  const row = list[0];
  const orderId = row.order_id as string;

  const { data: orderData, error: orderError } = await supabaseAdmin
    .from('orders' as any)
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError) {
    return { success: false, assignment: null, error: formatDbError(orderError) };
  }

  const assignment: DriverActiveDeliveryPayload = {
    ...(row as DriverActiveDeliveryPayload),
    status: assignmentStatusFromTimestamps(row as Parameters<typeof assignmentStatusFromTimestamps>[0]),
    order: orderData as DriverActiveDeliveryPayload['order'],
  };

  return { success: true, assignment };
}

export async function driverHasActiveDelivery(driverId: string): Promise<boolean> {
  const result = await fetchDriverActiveDelivery(driverId);
  return result.success && result.assignment !== null;
}
