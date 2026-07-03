/**
 * Favorite Order service for Supabase
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type FavoriteOrder = Database["public"]["Tables"]["favorite_orders"]["Row"];
type FavoriteOrderInsert = Database["public"]["Tables"]["favorite_orders"]["Insert"];

export type FavoriteOrderRecord = FavoriteOrder;

export async function getFavoriteOrder(profileId: string): Promise<FavoriteOrder | null> {
  const { data, error } = await supabase
    .from("favorite_orders")
    .select("*")
    .eq("user_id", profileId)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      // Favorite order not found
      return null;
    }
    throw new Error(`Failed to fetch favorite order: ${error.message}`);
  }

  return data;
}

export async function saveFavoriteOrder(
  profileId: string,
  items: FavoriteOrderInsert["items"],
): Promise<FavoriteOrder> {
  const upsertPayload: FavoriteOrderInsert = {
    user_id: profileId,
    items,
    updated_at: new Date().toISOString(),
  };

  const { data: favorite, error } = await supabase
    .from("favorite_orders")
    .upsert(upsertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save favorite order: ${error.message}`);
  }

  return favorite as FavoriteOrder;
}

export async function deleteFavoriteOrder(profileId: string): Promise<void> {
  const { error } = await supabase.from("favorite_orders").delete().eq("user_id", profileId);

  if (error) {
    throw new Error(`Failed to delete favorite order: ${error.message}`);
  }
}
