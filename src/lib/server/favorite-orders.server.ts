import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { serverLog } from "@/lib/server/logger";

type OrderSnapshotLine = {
  name: string;
  price: number;
  qty: number;
  category?: string | null;
  image?: string | null;
};

type ProductImageRow = {
  name: string;
  image: string | null;
};

type OrderFavoriteSourceRow = {
  user_id: string | null;
  items: OrderSnapshotLine[] | null;
};

function normalizeFavoriteSnapshot(items: OrderSnapshotLine[]): OrderSnapshotLine[] {
  return items
    .filter((item) => item && typeof item.name === "string" && item.qty > 0)
    .map((item) => ({
      name: item.name,
      price: Number(item.price),
      qty: Number(item.qty),
      category: item.category ?? undefined,
      image: item.image ?? undefined,
    }));
}

async function attachProductImages(items: OrderSnapshotLine[]): Promise<OrderSnapshotLine[]> {
  const missingImageNames = [
    ...new Set(items.filter((item) => !item.image).map((item) => item.name)),
  ];
  if (missingImageNames.length === 0) return items;

  const { data, error } = await supabaseAdmin
    .from("products" as never)
    .select("name, image")
    .in("name", missingImageNames);

  if (error) {
    serverLog.warn("order.rejected", {
      reason: "favorite_image_lookup_failed",
      error: error.message,
    });
    return items;
  }

  const imageByName = new Map<string, string | null>();
  for (const row of (data ?? []) as ProductImageRow[]) {
    imageByName.set(row.name, row.image);
  }

  return items.map((item) => ({
    ...item,
    image: item.image ?? imageByName.get(item.name) ?? undefined,
  }));
}

export async function syncLatestSuccessfulOrderToFavorite(orderId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("user_id, items")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    serverLog.error("order.rejected", {
      orderId,
      reason: "order_lookup_failed",
      error: error.message,
    });
    return;
  }

  const order = data as OrderFavoriteSourceRow | null;
  if (!order?.user_id || !Array.isArray(order.items) || order.items.length === 0) {
    return;
  }

  const snapshot = await attachProductImages(normalizeFavoriteSnapshot(order.items));
  if (snapshot.length === 0) {
    return;
  }

  const { error: upsertError } = await supabaseAdmin.from("favorite_orders").upsert(
    {
      user_id: order.user_id,
      items: snapshot as never,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id" },
  );

  if (upsertError) {
    serverLog.error("order.rejected", {
      orderId,
      userId: order.user_id,
      reason: "favorite_upsert_failed",
      error: upsertError.message,
    });
    return;
  }

  serverLog.info("order.created", {
    orderId,
    userId: order.user_id,
    itemCount: snapshot.length,
    note: "favorite_synced_from_successful_order",
  });
}
