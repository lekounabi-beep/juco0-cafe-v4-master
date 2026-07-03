/**
 * Types for favorite / reorder restore pipeline.
 */

export type OrderLineSnapshot = {
  name: string;
  price: number;
  qty: number;
  category?: string;
  image?: string;
};

export type ValidatedOrderLine = {
  name: string;
  price: number;
  qty: number;
  category?: string;
  image?: string;
  priceChanged: boolean;
  previousPrice?: number;
};

export type OrderLineValidationIssue = {
  name: string;
  qty: number;
  reason: "missing" | "unavailable";
};

export type OrderLineValidationResult = {
  valid: ValidatedOrderLine[];
  issues: OrderLineValidationIssue[];
  hasPriceChanges: boolean;
};

export type RestoreOrderOptions = {
  redirectToCheckout?: boolean;
};

export type RestoreOrderOutcome =
  | { status: "applied"; hasPriceChanges: boolean }
  | { status: "needs_confirmation"; result: OrderLineValidationResult }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };
