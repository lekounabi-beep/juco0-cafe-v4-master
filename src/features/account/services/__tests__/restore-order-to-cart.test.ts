import { describe, expect, it, vi, beforeEach } from "vitest";
import { applyValidatedLinesToCart } from "../restore-order-to-cart";

describe("applyValidatedLinesToCart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restores correct quantities and images", () => {
    const clear = vi.fn();
    const add = vi.fn();
    const setQty = vi.fn();

    applyValidatedLinesToCart(
      [
        {
          name: "Freddo Espresso",
          price: 2.5,
          qty: 3,
          category: "ΚΑΦΕΔΕΣ",
          image: "https://example.com/freddo.jpg",
          priceChanged: false,
        },
        {
          name: "Croissant",
          price: 2.2,
          qty: 1,
          category: "SNACKS",
          priceChanged: false,
        },
      ],
      { clear, add, setQty },
    );

    expect(clear).toHaveBeenCalledOnce();
    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenNthCalledWith(1, {
      name: "Freddo Espresso",
      price: 2.5,
      category: "ΚΑΦΕΔΕΣ",
      image: "https://example.com/freddo.jpg",
    });
    expect(setQty).toHaveBeenCalledWith("Freddo Espresso", 3);
    expect(setQty).not.toHaveBeenCalledWith("Croissant", expect.anything());
  });
});
