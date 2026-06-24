'use server';

import { supabaseAdmin } from '@/integrations/supabase/client.server';
import type { DriverProfile } from '@/features/delivery/types/delivery.types';

export async function authenticateDriver(
  username: string,
  password: string
): Promise<DriverProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('drivers' as any)
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as DriverProfile;
}

export async function getDriverProfileById(driverId: string): Promise<DriverProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('drivers' as any)
    .select('*')
    .eq('id', driverId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as DriverProfile;
}

export async function listDriverLoginUsernames(): Promise<
  { username: string; full_name: string }[]
> {
  const { data } = await supabaseAdmin
    .from('drivers' as any)
    .select('username, full_name')
    .eq('is_active', true)
    .not('username', 'is', null)
    .order('full_name');

  return (data as { username: string; full_name: string }[] | null) ?? [];
}
