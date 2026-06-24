'use server';

import { assertNotClientContext } from '@/shared/utils/client-architecture-guard';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { isUUID } from '@/shared/utils/uuid';
import type { DriverLocationInsertPayload } from '@/features/delivery/services/gps-repository';

assertNotClientContext('record-driver-location');

export type InsertDriverLocationResult = {
  success: boolean;
  error?: string;
};

function formatDbError(error: { message?: string; details?: string; hint?: string }): string {
  return [error.message, error.details, error.hint].filter(Boolean).join(' — ') || 'Database error';
}

/**
 * @deprecated Use gps-repository.insertDriverLocation from client GPS flow.
 * Server-only fallback via service role.
 */
export async function insertDriverLocation(
  payload: DriverLocationInsertPayload
): Promise<InsertDriverLocationResult> {
  const assignmentId = payload.delivery_assignment_id;
  const driverId = payload.driver_id;

  if (!isUUID(assignmentId) || !isUUID(driverId)) {
    return { success: false, error: 'Invalid assignment_id or driver_id UUID' };
  }

  if (typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
    return { success: false, error: 'lat and lng must be numbers' };
  }

  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from('delivery_assignments' as any)
    .select('id, driver_id')
    .eq('id', assignmentId)
    .eq('driver_id', driverId)
    .maybeSingle();

  if (assignmentError) {
    return { success: false, error: formatDbError(assignmentError) };
  }

  if (!assignment) {
    return {
      success: false,
      error: `No active assignment ${assignmentId} for driver ${driverId}`,
    };
  }

  const row = {
    delivery_assignment_id: assignmentId,
    driver_id: driverId,
    lat: payload.lat,
    lng: payload.lng,
    accuracy: payload.accuracy,
    speed: payload.speed,
    heading: payload.heading,
    recorded_at: payload.recorded_at,
  };

  const { error } = await supabaseAdmin.from('delivery_locations' as any).insert(row as any);

  if (error) {
    return { success: false, error: formatDbError(error) };
  }

  return { success: true };
}
