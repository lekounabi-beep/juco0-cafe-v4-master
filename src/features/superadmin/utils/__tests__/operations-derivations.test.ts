import { describe, expect, it } from "vitest";
import {
  deriveLiveOrdersOverview,
  deriveOperationalAlerts,
  deriveOrderDurationAlerts,
  derivePaymentsOverview,
  derivePlatformHealth,
  isGpsStale,
} from "@/features/superadmin/utils/operations-derivations";

const baseOrder = {
  id: "o1",
  order_number: "1001",
  status: "preparing",
  delivery_status: "pending",
  payment_method: "cod",
  payment_status: "pending",
  customer_phone: "6900000000",
  customer_name: "Test Customer",
  driver_id: null,
  created_at: new Date(Date.now() - 30 * 60_000).toISOString(),
  total: 12.5,
  items: [{ name: "Latte", qty: 1, price: 12.5 }],
};

describe("operations-derivations", () => {
  it("derives live order counts from active orders", () => {
    const result = deriveLiveOrdersOverview([
      baseOrder,
      { ...baseOrder, id: "o2", status: "ready", order_number: "1002" },
      {
        ...baseOrder,
        id: "o3",
        status: "ready",
        delivery_status: "in_transit",
        order_number: "1003",
      },
    ]);

    expect(result.preparing).toBe(1);
    expect(result.ready).toBe(1);
    expect(result.delivering).toBe(1);
  });

  it("derives payment overview", () => {
    const result = derivePaymentsOverview([
      baseOrder,
      {
        ...baseOrder,
        id: "o2",
        payment_method: "card",
        payment_status: "paid",
        viva_transaction_id: "txn-1",
      },
      { ...baseOrder, id: "o3", payment_method: "card", payment_status: "failed" },
    ]);

    expect(result.cash).toBe(1);
    expect(result.card).toBe(2);
    expect(result.viva).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.pending).toBe(1);
  });

  it("flags stale gps after 60 seconds", () => {
    const fresh = new Date(Date.now() - 30_000).toISOString();
    const stale = new Date(Date.now() - 120_000).toISOString();
    expect(isGpsStale(fresh)).toBe(false);
    expect(isGpsStale(stale)).toBe(true);
  });

  it("creates duration alerts for long preparing orders", () => {
    const alerts = deriveOrderDurationAlerts([baseOrder]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.stage).toBe("preparing");
  });

  it("derives platform health warnings when mapbox is missing", () => {
    const health = derivePlatformHealth({
      databaseHealthy: true,
      integrations: { supabase: true, mapbox: false, viva: true, googleMaps: true },
      trackingEnabled: true,
      driverTrackingAvailable: false,
    });

    expect(health.status).toBe("warning");
    expect(health.checks.some((c) => c.key === "mapbox" && c.status === "warning")).toBe(true);
  });

  it("creates operational alerts for payment failure and gps stale", () => {
    const alerts = deriveOperationalAlerts({
      orders: [{ ...baseOrder, payment_status: "failed" }],
      drivers: [
        {
          id: "d1",
          full_name: "Nikos",
          availability_status: "offline",
          is_active: true,
          last_location_update: new Date(Date.now() - 120_000).toISOString(),
          current_location_lat: 38.1,
          current_location_lng: 21.8,
          has_active_assignment: true,
        },
      ],
      integrations: { supabase: true, mapbox: true, viva: true, googleMaps: true },
      databaseHealthy: true,
    });

    expect(alerts.some((a) => a.id.startsWith("payment-failed"))).toBe(true);
    expect(alerts.some((a) => a.id.startsWith("driver-offline-delivery"))).toBe(true);
    expect(alerts.some((a) => a.id.startsWith("gps-stale"))).toBe(true);
    expect(alerts[0]?.titleKey).toBeDefined();
  });
});
