import { describe, expect, it } from "vitest";
import { isTerminalOrder } from "@/features/tracking/core/terminal-order";

describe("isTerminalOrder", () => {
  it("returns false for null", () => {
    expect(isTerminalOrder(null)).toBe(false);
  });

  it("detects delivered", () => {
    expect(isTerminalOrder({ status: "delivered", delivery_status: "in_transit" })).toBe(true);
    expect(isTerminalOrder({ status: "pending", delivery_status: "delivered" })).toBe(true);
  });

  it("detects cancelled", () => {
    expect(isTerminalOrder({ status: "cancelled", delivery_status: "pending" })).toBe(true);
  });

  it("detects payment failed", () => {
    expect(isTerminalOrder({ status: "pending", payment_status: "failed" })).toBe(true);
  });

  it("returns false for active delivery", () => {
    expect(isTerminalOrder({ status: "in_transit", delivery_status: "in_transit" })).toBe(false);
  });
});
