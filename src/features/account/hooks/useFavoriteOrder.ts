/**
 * Favorite Order hook - manages user's favorite order
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCart } from '@/lib/cart-store';
import { getProfile, getOrCreateProfile } from '@/integrations/supabase/services/profile.service';
import {
  getFavoriteOrder,
  saveFavoriteOrder,
  deleteFavoriteOrder,
} from '@/integrations/supabase/services/favorite.service';
import type { CartItem } from '@/lib/cart-store';

export function useFavoriteOrder() {
  const { user } = useAuth();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const add = useCart((s) => s.add);
  const [favorite, setFavorite] = useState<CartItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFavorite() {
      if (!user) {
        setFavorite(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Use getOrCreateProfile to ensure profile exists
        const profile = await getOrCreateProfile(user.id, user.email, user.user_metadata?.full_name || user.user_metadata?.name);
        const data = await getFavoriteOrder(profile.id);
        setFavorite((data?.items as unknown as CartItem[]) || null);
      } catch (err) {
        console.error('Failed to load favorite order:', err);
        setError(err instanceof Error ? err.message : 'Failed to load favorite order');
      } finally {
        setLoading(false);
      }
    }

    loadFavorite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const save = async () => {
    if (!user || items.length === 0) {
      setError('Cannot save empty cart');
      return { success: false };
    }

    try {
      setLoading(true);
      setError(null);
      // Use getOrCreateProfile to ensure profile exists
      const profile = await getOrCreateProfile(user.id, user.email, user.user_metadata?.full_name || user.user_metadata?.name);
      await saveFavoriteOrder(profile.id, items);
      setFavorite(items);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save favorite order';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!user) {
      setError('User not authenticated');
      return { success: false };
    }

    try {
      setLoading(true);
      setError(null);
      // Use getOrCreateProfile to ensure profile exists
      const profile = await getOrCreateProfile(user.id, user.email, user.user_metadata?.full_name || user.user_metadata?.name);
      await deleteFavoriteOrder(profile.id);
      setFavorite(null);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete favorite order';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const loadToCart = async () => {
    if (!favorite || favorite.length === 0) {
      return { success: false };
    }

    try {
      setLoading(true);
      setError(null);
      clear();
      favorite.forEach((item) => {
        add({
          name: item.name,
          price: item.price,
          category: item.category,
        });
      });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load favorite order';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    favorite,
    loading,
    error,
    save,
    remove,
    loadToCart,
  };
}
