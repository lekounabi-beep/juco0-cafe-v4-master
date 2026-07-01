// @ts-nocheck - Supabase types not generated yet for new tables (products, store_settings)
// Run migration and generate types to remove this directive

import { supabase } from '@/integrations/supabase/client';

export interface BusinessHours {
  monday: { open: string; close: string };
  tuesday: { open: string; close: string };
  wednesday: { open: string; close: string };
  thursday: { open: string; close: string };
  friday: { open: string; close: string };
  saturday: { open: string; close: string };
  sunday: { open: string; close: string };
}

export interface StoreInfo {
  address: string;
  phone: string;
  instagram: string;
}

export interface StoreSettings {
  business_hours: BusinessHours;
  store_info: StoreInfo;
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const { data: hoursData } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'business_hours')
    .single() as any;

  const { data: infoData } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'store_info')
    .single() as any;

  return {
    business_hours: hoursData?.value as BusinessHours || getDefaultBusinessHours(),
    store_info: normalizeStoreInfoFromDb(infoData?.value),
  };
}

function normalizeStoreInfoFromDb(raw: unknown): StoreInfo {
  const fallback = getDefaultStoreInfo();
  if (!raw || typeof raw !== "object") return fallback;

  const record = raw as Record<string, unknown>;
  return {
    address: typeof record.address === "string" && record.address.trim() ? record.address.trim() : fallback.address,
    phone: typeof record.phone === "string" && record.phone.trim() ? record.phone.trim() : fallback.phone,
    instagram:
      typeof record.instagram === "string" && record.instagram.trim()
        ? record.instagram.trim()
        : fallback.instagram,
  };
}

export async function updateBusinessHours(hours: BusinessHours): Promise<void> {
  // @ts-ignore - Supabase types not generated yet for new tables
  const { error } = await supabase
    .from('store_settings' as any)
    .update({ value: hours } as any)
    .eq('key', 'business_hours') as any;

  if (error) throw error;
}

export async function updateStoreInfo(info: StoreInfo): Promise<void> {
  // @ts-ignore - Supabase types not generated yet for new tables
  const { error } = await supabase
    .from('store_settings' as any)
    .update({ value: info } as any)
    .eq('key', 'store_info') as any;

  if (error) throw error;
}

function getDefaultBusinessHours(): BusinessHours {
  return {
    monday: { open: '07:00', close: '21:00' },
    tuesday: { open: '07:00', close: '21:00' },
    wednesday: { open: '07:00', close: '21:00' },
    thursday: { open: '07:00', close: '21:00' },
    friday: { open: '07:00', close: '21:00' },
    saturday: { open: '07:00', close: '21:00' },
    sunday: { open: '07:00', close: '21:00' },
  };
}

function getDefaultStoreInfo(): StoreInfo {
  return {
    address: 'Nafpaktos, Greece',
    phone: '+30 26340 00000',
    instagram: '@juco.nafpaktos',
  };
}
