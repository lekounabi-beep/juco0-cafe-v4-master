import { getProductsByNames } from "@/integrations/supabase/services/product.service";
import type {
  OrderLineSnapshot,
  OrderLineValidationIssue,
  OrderLineValidationResult,
  ValidatedOrderLine,
} from "../types/order-restore.types";

export async function validateOrderLines(
  lines: OrderLineSnapshot[],
): Promise<OrderLineValidationResult> {
  if (!lines.length) {
    return { valid: [], issues: [], hasPriceChanges: false };
  }

  const names = [...new Set(lines.map((line) => line.name))];
  const products = await getProductsByNames(names);
  const byName = new Map(products.map((product) => [product.name, product]));

  const valid: ValidatedOrderLine[] = [];
  const issues: OrderLineValidationIssue[] = [];
  let hasPriceChanges = false;

  for (const line of lines) {
    if (line.qty <= 0) continue;

    const product = byName.get(line.name);
    if (!product) {
      issues.push({ name: line.name, qty: line.qty, reason: "missing" });
      continue;
    }

    if (!product.is_available) {
      issues.push({ name: line.name, qty: line.qty, reason: "unavailable" });
      continue;
    }

    const livePrice = Number(product.price);
    const priceChanged = Math.abs(livePrice - line.price) > 0.001;
    if (priceChanged) {
      hasPriceChanges = true;
    }

    valid.push({
      name: line.name,
      price: livePrice,
      qty: line.qty,
      category: line.category ?? product.category,
      image: line.image ?? product.image ?? undefined,
      priceChanged,
      previousPrice: priceChanged ? line.price : undefined,
    });
  }

  return { valid, issues, hasPriceChanges };
}

export function toOrderLineSnapshots(
  items: Array<{
    name: string;
    price: number;
    qty: number;
    category?: string;
    image?: string;
  }>,
): OrderLineSnapshot[] {
  return items.map((item) => ({
    name: item.name,
    price: item.price,
    qty: item.qty,
    category: item.category,
    image: item.image,
  }));
}
