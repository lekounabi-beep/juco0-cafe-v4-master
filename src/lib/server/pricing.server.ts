/**
 * Server-authoritative order pricing — never trust client-supplied prices or totals.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { calcDeliveryFee } from "@/shared/utils/currency";
import { serverLog } from "./logger";

export type CartLineInput = {
  name: string;
  qty: number;
  category?: string;
};

export type PricedOrderLine = {
  name: string;
  price: number;
  qty: number;
  category?: string;
};

export type ComputedOrderTotals = {
  items: PricedOrderLine[];
  subtotal: number;
  delivery_fee: number;
  total: number;
};

type ProductRow = {
  name: string;
  price: number;
  category: string;
  is_available: boolean;
};

export async function computeOrderTotalsFromDatabase(
  cartItems: CartLineInput[],
  fulfillment: "pickup" | "delivery",
): Promise<ComputedOrderTotals> {
  if (!cartItems.length) {
    throw new Error("Το καλάθι σου είναι άδειο");
  }

  const names = [...new Set(cartItems.map((i) => i.name))];

  const { data: products, error } = await supabaseAdmin
    .from("products" as never)
    .select("name, price, category, is_available")
    .in("name", names);

  if (error) {
    serverLog.error("order.rejected", { reason: "product_fetch_failed", error: error.message });
    throw new Error("Δεν μπορέσαμε να επιβεβαιώσουμε τις τιμές. Δοκιμάστε ξανά.");
  }

  const byName = new Map<string, ProductRow>();
  for (const row of (products ?? []) as ProductRow[]) {
    byName.set(row.name, row);
  }

  const pricedItems: PricedOrderLine[] = [];

  for (const line of cartItems) {
    if (line.qty <= 0) continue;

    const product = byName.get(line.name);
    if (!product) {
      serverLog.warn("order.rejected", { reason: "unknown_product", name: line.name });
      throw new Error(`Το προϊόν «${line.name}» δεν είναι διαθέσιμο.`);
    }

    if (!product.is_available) {
      serverLog.warn("order.rejected", { reason: "unavailable_product", name: line.name });
      throw new Error(`Το προϊόν «${line.name}» δεν είναι διαθέσιμο αυτή τη στιγμή.`);
    }

    pricedItems.push({
      name: line.name,
      price: Number(product.price),
      qty: line.qty,
      category: line.category ?? product.category,
    });
  }

  if (!pricedItems.length) {
    throw new Error("Το καλάθι σου είναι άδειο");
  }

  const subtotal = pricedItems.reduce((sum, i) => sum + i.qty * i.price, 0);
  const isPickup = fulfillment === "pickup";
  const delivery_fee = isPickup ? 0 : calcDeliveryFee(subtotal);
  const total = subtotal + delivery_fee;

  return { items: pricedItems, subtotal, delivery_fee, total };
}
