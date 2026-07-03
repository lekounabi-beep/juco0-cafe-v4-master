import { describe, expect, it } from "vitest";
import { computeDeliveryState } from "@/features/delivery/core/compute-delivery-state";

const baseAssignment = {
  id: "a",
  picked_up_at: "2026-01-01T10:00:00Z",
  started_delivery_at: "2026-01-01T10:05:00Z",
};

describe("computeDeliveryState", () => {
  it("derives on_the_way and trail during in_transit", () => {
    const state = computeDeliveryState({
      order: { status: "in_transit", delivery_status: "in_transit" },
      assignment: baseAssignment,
      locations: [{ lat: 37.98, lng: 23.73, recorded_at: "2026-01-01T10:06:00Z", heading: 90 }],
      role: "customer",
    });

    expect(state.customerStep).toBe("on_the_way");
    expect(state.driverPosition?.lat).toBe(37.98);
    expect(state.routePoints.length).toBe(1);
    expect(state.showDriverTrail).toBe(true);
  });

  it("returns received for pending order", () => {
    const state = computeDeliveryState({
      order: { status: "pending", delivery_status: "pending" },
      assignment: null,
      locations: [],
      role: "customer",
    });

    expect(state.customerStep).toBe("received");
    expect(state.gpsReady).toBe(false);
    expect(state.showDriverTrail).toBe(false);
    expect(state.routePoints).toEqual([]);
  });

  it("does not show trail when picked_up at store", () => {
    const state = computeDeliveryState({
      order: { status: "picked_up", delivery_status: "picked_up" },
      assignment: {
        id: "a",
        picked_up_at: "2026-01-01T10:00:00Z",
      },
      locations: [
        { lat: 37.98, lng: 23.73, recorded_at: "2026-01-01T10:01:00Z", heading: 0 },
        { lat: 37.99, lng: 23.74, recorded_at: "2026-01-01T10:02:00Z", heading: 0 },
      ],
      role: "customer",
    });

    expect(state.customerStep).toBe("on_the_way");
    expect(state.showDriverTrail).toBe(false);
    expect(state.routePoints).toEqual([]);
  });

  it("does not show trail when assigned even with GPS rows", () => {
    const state = computeDeliveryState({
      order: { status: "assigned", delivery_status: "assigned" },
      assignment: {
        id: "a",
        assigned_at: "2026-01-01T10:00:00Z",
        accepted_at: "2026-01-01T10:00:05Z",
      },
      locations: [
        { lat: 37.98, lng: 23.73, recorded_at: "2026-01-01T10:01:00Z", heading: 0 },
        { lat: 37.99, lng: 23.74, recorded_at: "2026-01-01T10:02:00Z", heading: 0 },
      ],
      role: "customer",
    });

    expect(state.customerStep).toBe("on_the_way");
    expect(state.showDriverTrail).toBe(false);
    expect(state.routePoints).toEqual([]);
  });

  it("does not show trail when cancelled", () => {
    const state = computeDeliveryState({
      order: { status: "in_transit", delivery_status: "cancelled" },
      assignment: {
        ...baseAssignment,
        cancelled_at: "2026-01-01T10:20:00Z",
      },
      locations: [
        { lat: 37.98, lng: 23.73, recorded_at: "2026-01-01T10:06:00Z", heading: 0 },
        { lat: 37.99, lng: 23.74, recorded_at: "2026-01-01T10:07:00Z", heading: 0 },
      ],
      role: "customer",
    });

    expect(state.customerStep).toBe("cancelled");
    expect(state.showDriverTrail).toBe(false);
    expect(state.routePoints).toEqual([]);
  });

  it("returns no trail when in_transit but started_delivery_at is missing", () => {
    const state = computeDeliveryState({
      order: { status: "in_transit", delivery_status: "in_transit" },
      assignment: null,
      locations: [
        { lat: 37.98, lng: 23.73, recorded_at: "2026-01-01T10:06:00Z", heading: 0 },
        { lat: 37.99, lng: 23.74, recorded_at: "2026-01-01T10:07:00Z", heading: 0 },
      ],
      role: "customer",
    });

    expect(state.deliveryStatus).toBe("in_transit");
    expect(state.showDriverTrail).toBe(true);
    expect(state.routePoints).toEqual([]);
  });

  it("excludes GPS recorded before started_delivery_at", () => {
    const state = computeDeliveryState({
      order: { status: "in_transit", delivery_status: "in_transit" },
      assignment: baseAssignment,
      locations: [
        { lat: 37.97, lng: 23.72, recorded_at: "2026-01-01T10:04:00Z", heading: 0 },
        { lat: 37.98, lng: 23.73, recorded_at: "2026-01-01T10:06:00Z", heading: 0 },
        { lat: 37.99, lng: 23.74, recorded_at: "2026-01-01T10:07:00Z", heading: 0 },
      ],
      role: "customer",
    });

    expect(state.routePoints).toEqual([
      { lat: 37.98, lng: 23.73, recordedAt: "2026-01-01T10:06:00Z" },
      { lat: 37.99, lng: 23.74, recordedAt: "2026-01-01T10:07:00Z" },
    ]);
  });

  it("hides trail when arrived or delivered", () => {
    const arrived = computeDeliveryState({
      order: { status: "in_transit", delivery_status: "arrived" },
      assignment: {
        ...baseAssignment,
        arrived_at: "2026-01-01T10:30:00Z",
      },
      locations: [{ lat: 37.98, lng: 23.73, recorded_at: "2026-01-01T10:06:00Z", heading: 0 }],
      role: "customer",
    });

    expect(arrived.showDriverTrail).toBe(false);
    expect(arrived.routePoints).toEqual([]);

    const delivered = computeDeliveryState({
      order: { status: "delivered", delivery_status: "delivered" },
      assignment: {
        ...baseAssignment,
        delivered_at: "2026-01-01T10:45:00Z",
      },
      locations: [{ lat: 37.98, lng: 23.73, recorded_at: "2026-01-01T10:06:00Z", heading: 0 }],
      role: "customer",
    });

    expect(delivered.showDriverTrail).toBe(false);
    expect(delivered.routePoints).toEqual([]);
  });
});
