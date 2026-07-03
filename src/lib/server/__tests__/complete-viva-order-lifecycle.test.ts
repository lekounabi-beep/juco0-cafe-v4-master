import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock("@/integrations/viva/services/payment.server", () => ({
  fetchVivaTransactionDetails: vi.fn(),
  fetchVivaTransactionIdByOrderCode: vi.fn(),
  assertVivaPaymentMatchesOrder: vi.fn(),
}));

vi.mock("@/lib/server/checkout-token.server", () => ({
  verifyCheckoutToken: vi.fn(),
}));

vi.mock("@/lib/server/order-access.server", () => ({
  setOrderAccessCookie: vi.fn(),
}));

vi.mock("@/lib/server/card-payment-cleanup.server", () => ({
  expireAbandonedCardPaymentOrders: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/server/logger", () => ({
  serverLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { finalizeCardPaymentReturn } from "@/lib/server/complete-viva-order.server";

function mockFromChain(result: { data: unknown; error?: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = maybeSingle;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  return chain;
}

describe("finalizeCardPaymentReturn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns track when orderId already paid", async () => {
    const chain = mockFromChain({
      data: {
        id: "order-1",
        order_number: "JU000100",
        payment_status: "paid",
        client_request_id: "req-1",
        viva_transaction_id: "txn-1",
      },
    });
    vi.mocked(supabaseAdmin.from).mockReturnValue(chain as never);

    const result = await finalizeCardPaymentReturn({
      orderId: "order-1",
    });

    expect(result.status).toBe("track");
    if (result.status === "track") {
      expect(result.order.id).toBe("order-1");
      expect(result.path).toBe("order_id_paid");
    }
  });

  it("returns checkout on viva failure eventId", async () => {
    const chain = mockFromChain({ data: null });
    vi.mocked(supabaseAdmin.from).mockReturnValue(chain as never);

    const result = await finalizeCardPaymentReturn({
      vivaOrderCode: "1234567890123456",
      eventId: "2061",
    });

    expect(result.status).toBe("checkout");
    if (result.status === "checkout") {
      expect(result.eventId).toBe("2061");
    }
  });
});
