import type { CartItem } from "@/lib/cart-store";
import { validateOrderLines } from "./order-line-validation.service";
import type {
  OrderLineSnapshot,
  OrderLineValidationResult,
  RestoreOrderOutcome,
  ValidatedOrderLine,
} from "../types/order-restore.types";

type CartActions = {
  clear: () => void;
  add: (item: Omit<CartItem, "qty">) => void;
  setQty: (name: string, qty: number) => void;
};

export function applyValidatedLinesToCart(lines: ValidatedOrderLine[], cart: CartActions): void {
  cart.clear();

  for (const line of lines) {
    cart.add({
      name: line.name,
      price: line.price,
      category: line.category,
      image: line.image,
    });

    if (line.qty !== 1) {
      cart.setQty(line.name, line.qty);
    }
  }
}

export async function restoreOrderToCart(
  lines: OrderLineSnapshot[],
  cart: CartActions,
  options?: { skipIssueCheck?: boolean; validation?: OrderLineValidationResult },
): Promise<RestoreOrderOutcome> {
  if (!lines.length) {
    return { status: "empty", message: "Δεν υπάρχουν προϊόντα για επαναφορά." };
  }

  try {
    const validation = options?.validation ?? (await validateOrderLines(lines));

    if (!options?.skipIssueCheck && validation.issues.length > 0) {
      return { status: "needs_confirmation", result: validation };
    }

    if (!validation.valid.length) {
      return {
        status: "empty",
        message: "Κανένα από τα προϊόντα δεν είναι διαθέσιμο αυτή τη στιγμή.",
      };
    }

    applyValidatedLinesToCart(validation.valid, cart);

    return {
      status: "applied",
      hasPriceChanges: validation.hasPriceChanges,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Η επαναφορά απέτυχε.",
    };
  }
}
