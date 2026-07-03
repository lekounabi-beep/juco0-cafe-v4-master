"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  deleteFavoriteOrder,
  type FavoriteOrderRecord,
} from "@/integrations/supabase/services/favorite.service";
import { resolveAccountProfileId } from "../lib/account-profile-cache";
import {
  clearFavoriteOrderCache,
  fetchCachedFavoriteOrder,
  subscribeFavoriteOrderCache,
  getFavoriteOrderCache,
} from "../lib/favorite-order-cache";
import type { CartItem } from "@/lib/cart-store";

function parseFavoriteItems(record: FavoriteOrderRecord | null): CartItem[] | null {
  if (!record?.items) return null;
  const items = record.items as unknown as CartItem[];
  return items.length > 0 ? items : null;
}

export function useFavoriteOrder() {
  const { user } = useAuth();
  const [favoriteRecord, setFavoriteRecord] = useState<FavoriteOrderRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const favorite = parseFavoriteItems(favoriteRecord);

  const loadFavorite = useCallback(async () => {
    if (!user) {
      setFavoriteRecord(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const profileId = await resolveAccountProfileId(
        user.id,
        user.email,
        user.user_metadata?.full_name || user.user_metadata?.name,
      );

      if (!profileId) {
        setFavoriteRecord(null);
        return;
      }

      const data = await fetchCachedFavoriteOrder(user.id, profileId);
      setFavoriteRecord(data);
    } catch (err) {
      console.error("Failed to load favorite order:", err);
      setError(err instanceof Error ? err.message : "Αποτυχία φόρτωσης συνήθους παραγγελίας");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadFavorite();
  }, [loadFavorite]);

  useEffect(() => {
    return subscribeFavoriteOrderCache(() => {
      if (!user) return;
      const cached = getFavoriteOrderCache(user.id);
      if (cached !== undefined) {
        setFavoriteRecord(cached);
        return;
      }
      void loadFavorite();
    });
  }, [loadFavorite, user]);

  const remove = useCallback(async () => {
    if (!user) {
      setError("Απαιτείται σύνδεση");
      return { success: false as const };
    }

    try {
      setLoading(true);
      setError(null);

      const profileId = await resolveAccountProfileId(
        user.id,
        user.email,
        user.user_metadata?.full_name || user.user_metadata?.name,
      );

      if (!profileId) {
        throw new Error("Δεν βρέθηκε προφίλ χρήστη");
      }

      await deleteFavoriteOrder(profileId);
      clearFavoriteOrderCache(user.id);
      setFavoriteRecord(null);
      return { success: true as const };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Αποτυχία διαγραφής συνήθους παραγγελίας";
      setError(message);
      return { success: false as const, error: message };
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    favorite,
    favoriteRecord,
    hasFavorite: Boolean(favorite?.length),
    updatedAt: favoriteRecord?.updated_at ?? null,
    loading,
    error,
    remove,
    refresh: loadFavorite,
  };
}
