/**
 * Orders hook - manages user orders
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getProfile } from "@/integrations/supabase/services/profile.service";
import { getUserOrders } from "@/integrations/supabase/services/order.service";
import type { Order } from "@/features/account/types/account.types";

export function useOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      if (!user) {
        setOrders([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const profile = await getProfile(user.id);
        if (!profile) {
          setOrders([]);
          return;
        }
        const data = await getUserOrders(profile.id);
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [user]);

  return {
    orders,
    loading,
    error,
  };
}
