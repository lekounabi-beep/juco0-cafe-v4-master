import { describe, expect, it, vi, beforeEach } from "vitest";
import { validateOrderLines } from "../order-line-validation.service";

vi.mock("@/integrations/supabase/services/product.service", () => ({
  getProductsByNames: vi.fn(),
}));

import { getProductsByNames } from "@/integrations/supabase/services/product.service";

const mockedGetProductsByNames = vi.mocked(getProductsByNames);

describe("validateOrderLines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flags missing and unavailable products", async () => {
    mockedGetProductsByNames.mockResolvedValue([
      {
        name: "Espresso",
        price: 2,
        category: "ΚΑΦΕΔΕΣ",
        image: null,
        is_available: false,
      } as never,
    ]);

    const result = await validateOrderLines([
      { name: "Espresso", price: 2, qty: 1 },
      { name: "Removed Item", price: 3, qty: 2 },
    ]);

    expect(result.valid).toHaveLength(0);
    expect(result.issues).toEqual([
      { name: "Espresso", qty: 1, reason: "unavailable" },
      { name: "Removed Item", qty: 2, reason: "missing" },
    ]);
  });

  it("refreshes prices for available products", async () => {
    mockedGetProductsByNames.mockResolvedValue([
      {
        name: "Freddo Espresso",
        price: 2.7,
        category: "ΚΑΦΕΔΕΣ",
        image: "https://example.com/freddo.jpg",
        is_available: true,
      } as never,
    ]);

    const result = await validateOrderLines([
      { name: "Freddo Espresso", price: 2.5, qty: 3, image: "old.jpg" },
    ]);

    expect(result.issues).toHaveLength(0);
    expect(result.hasPriceChanges).toBe(true);
    expect(result.valid[0]).toMatchObject({
      name: "Freddo Espresso",
      price: 2.7,
      qty: 3,
      image: "old.jpg",
      priceChanged: true,
      previousPrice: 2.5,
    });
  });
});
