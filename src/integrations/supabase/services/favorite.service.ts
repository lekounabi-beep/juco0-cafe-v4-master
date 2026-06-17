/**
 * Favorite Order service for Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type FavoriteOrder = Database['public']['Tables']['favorite_orders']['Row'];
type FavoriteOrderInsert = Database['public']['Tables']['favorite_orders']['Insert'];

export async function getFavoriteOrder(profileId: string): Promise<FavoriteOrder | null> {
  const { data, error } = await supabase
    .from('favorite_orders')
    .select('*')
    .eq('user_id', profileId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') {
      // Favorite order not found
      return null;
    }
    throw new Error(`Failed to fetch favorite order: ${error.message}`);
  }

  return data;
}

export async function saveFavoriteOrder(profileId: string, items: any): Promise<FavoriteOrder> {
  const { data: favorite, error } = await supabase
    .from('favorite_orders')
    .upsert({
      user_id: profileId,
      items: items,
      updated_at: new Date().toISOString(),
    } as any)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save favorite order: ${error.message}`);
  }

  return favorite as FavoriteOrder;
}

export async function deleteFavoriteOrder(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('favorite_orders')
    .delete()
    .eq('user_id', profileId);

  if (error) {
    throw new Error(`Failed to delete favorite order: ${error.message}`);
  }
}
