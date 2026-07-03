import {
  getFavoriteOrder,
  type FavoriteOrderRecord,
} from "@/integrations/supabase/services/favorite.service";

type FavoriteCacheEntry = {
  userId: string;
  order: FavoriteOrderRecord | null;
};

let favoriteCache: FavoriteCacheEntry | null = null;
const inflightByUser = new Map<string, Promise<FavoriteOrderRecord | null>>();
const listeners = new Set<() => void>();

function notifyFavoriteOrderListeners(): void {
  listeners.forEach((listener) => listener());
}

export function getFavoriteOrderCache(userId: string): FavoriteOrderRecord | null | undefined {
  if (favoriteCache?.userId !== userId) return undefined;
  return favoriteCache.order;
}

export function subscribeFavoriteOrderCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearFavoriteOrderCache(userId?: string): void {
  if (!userId || favoriteCache?.userId === userId) {
    favoriteCache = null;
    if (userId) inflightByUser.delete(userId);
    notifyFavoriteOrderListeners();
  }
}

export async function fetchCachedFavoriteOrder(
  userId: string,
  profileId: string,
): Promise<FavoriteOrderRecord | null> {
  const existing = inflightByUser.get(userId);
  if (existing) {
    return existing;
  }

  const request = getFavoriteOrder(profileId)
    .then((order) => {
      favoriteCache = { userId, order };
      inflightByUser.delete(userId);
      return order;
    })
    .catch((error) => {
      inflightByUser.delete(userId);
      throw error;
    });

  inflightByUser.set(userId, request);
  return request;
}
