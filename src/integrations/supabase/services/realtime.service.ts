/**
 * Unified Realtime Service
 * Extends existing Supabase realtime implementation for orders and adds support for deliveries and drivers
 */

import { supabase } from "@/integrations/supabase/client";

export type ConnectionState = "connected" | "connecting" | "disconnected" | "reconnecting";

export type SubscriptionType = "orders" | "deliveries" | "drivers" | "delivery_assignments";

type SubscriptionFilter = {
  event?: "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
};

/** Shape used by postgres_changes callbacks across admin/driver/tracking hooks. */
export type RealtimeChangePayload = {
  eventType?: "INSERT" | "UPDATE" | "DELETE";
  commit_timestamp?: string;
  new?: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
  };
  old?: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
  };
};

export interface RealtimeSubscription {
  id: string;
  type: SubscriptionType;
  channelKey: string;
  callback: (payload: RealtimeChangePayload) => void;
  filter?: SubscriptionFilter;
}

type ChannelGroup = {
  channelKey: string;
  type: SubscriptionType;
  filter?: SubscriptionFilter;
  channel: ReturnType<typeof supabase.channel>;
  listenerIds: Set<string>;
};

const RECONNECT_SUBSCRIBE_TIMEOUT_MS = 15_000;

let reconnectInFlight: Promise<void> | null = null;
let reconnectGeneration = 0;

class RealtimeService {
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private channelGroups: Map<string, ChannelGroup> = new Map();
  private connectionState: ConnectionState = "disconnected";
  private suppressDisconnectedEvents = false;

  constructor() {
    this.setupConnectionMonitoring();
  }

  private isDevLogging(): boolean {
    return process.env.NODE_ENV === "development";
  }

  private setupConnectionMonitoring() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        void this.reconnectNow();
      });

      window.addEventListener("offline", () => {
        this.setConnectionState("disconnected");
      });
    }
  }

  private buildChannelKey(type: SubscriptionType, filter?: SubscriptionFilter): string {
    return `${type}:${filter?.event ?? "*"}:${filter?.filter ?? ""}`;
  }

  private dispatchChannelEvent(channelKey: string, payload: RealtimeChangePayload): void {
    const group = this.channelGroups.get(channelKey);
    if (!group) return;

    for (const listenerId of group.listenerIds) {
      const subscription = this.subscriptions.get(listenerId);
      subscription?.callback(payload);
    }
  }

  private logRealtime(
    event:
      | "reconnect_begin"
      | "reconnect_skip_inflight"
      | "reconnect_subscribe_start"
      | "reconnect_subscribe_done"
      | "reconnect_complete"
      | "reconnect_failed",
    payload: Record<string, unknown> = {},
  ): void {
    if (!this.isDevLogging()) return;
    console.info(`[Realtime] ${event}`, {
      generation: reconnectGeneration,
      phase: this.connectionState,
      ...payload,
    });
  }

  private setConnectionState(state: ConnectionState) {
    if (this.connectionState === state) return;
    this.connectionState = state;
    if (this.isDevLogging()) {
      console.log(`[Realtime] Connection state: ${state}`);
    }
  }

  reconnectNow(): Promise<void> {
    if (reconnectInFlight) {
      this.logRealtime("reconnect_skip_inflight", { reason: "in_flight" });
      return reconnectInFlight;
    }

    if (this.connectionState === "reconnecting") {
      this.logRealtime("reconnect_skip_inflight", { reason: "already_reconnecting" });
      return Promise.resolve();
    }

    const generation = ++reconnectGeneration;
    this.logRealtime("reconnect_begin", { generation });

    reconnectInFlight = (async () => {
      try {
        this.setConnectionState("reconnecting");
        await this.reconnectAllSubscriptions(generation);
        this.setConnectionState("connected");
        this.logRealtime("reconnect_complete", { generation });
      } catch (err) {
        this.logRealtime("reconnect_failed", {
          generation,
          error: err instanceof Error ? err.message : String(err),
        });
        this.setConnectionState("disconnected");
        throw err;
      } finally {
        reconnectInFlight = null;
      }
    })();

    return reconnectInFlight;
  }

  private handleChannelStatus(status: string): void {
    if (
      this.suppressDisconnectedEvents &&
      (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT")
    ) {
      return;
    }

    if (status === "SUBSCRIBED") {
      if (!this.suppressDisconnectedEvents) {
        this.setConnectionState("connected");
      }
      return;
    }

    if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      this.setConnectionState("disconnected");
    }
  }

  private createChannel(
    channelKey: string,
    type: SubscriptionType,
    filter?: SubscriptionFilter,
    onSubscribed?: () => void,
    onError?: (error: Error) => void,
  ): ReturnType<typeof supabase.channel> {
    const tableName = this.getTableName(type);

    const config: Record<string, string> = {
      event: filter?.event || "*",
      schema: "public",
      table: tableName,
    };

    if (filter?.filter) {
      config.filter = filter.filter;
    }

    return supabase
      .channel(`rt-${channelKey}`)
      .on("postgres_changes", config as never, (payload) => {
        if (this.isDevLogging()) {
          console.log(`[Realtime] ${type} event:`, payload);
        }
        this.dispatchChannelEvent(channelKey, payload as RealtimeChangePayload);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          onSubscribed?.();
          return;
        }

        if (status === "CHANNEL_ERROR") {
          onError?.(new Error(`channel_error:${channelKey}`));
          return;
        }

        this.handleChannelStatus(status);
      });
  }

  private async reconnectAllSubscriptions(generation: number): Promise<void> {
    if (this.channelGroups.size === 0) {
      return;
    }

    this.logRealtime("reconnect_subscribe_start", {
      generation,
      count: this.channelGroups.size,
    });

    const snapshot = Array.from(this.channelGroups.values()).map((group) => ({
      channelKey: group.channelKey,
      type: group.type,
      filter: group.filter,
      listenerIds: Array.from(group.listenerIds),
    }));

    this.suppressDisconnectedEvents = true;
    try {
      for (const group of this.channelGroups.values()) {
        try {
          await supabase.removeChannel(group.channel);
        } catch {
          // intentional teardown during reconnect
        }
      }
      this.channelGroups.clear();

      const subscribePromises = snapshot.map((item) =>
        this.resubscribeChannelGroup(item.channelKey, item.type, item.filter, item.listenerIds),
      );

      await Promise.race([
        Promise.all(subscribePromises),
        new Promise<void>((_, reject) => {
          setTimeout(
            () => reject(new Error("reconnect_subscribe_timeout")),
            RECONNECT_SUBSCRIBE_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      this.suppressDisconnectedEvents = false;
    }

    this.logRealtime("reconnect_subscribe_done", { generation });
  }

  private resubscribeChannelGroup(
    channelKey: string,
    type: SubscriptionType,
    filter: SubscriptionFilter | undefined,
    listenerIds: string[],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const channel = this.createChannel(
        channelKey,
        type,
        filter,
        () => {
          this.channelGroups.set(channelKey, {
            channelKey,
            type,
            filter,
            channel,
            listenerIds: new Set(listenerIds),
          });
          resolve();
        },
        reject,
      );
    });
  }

  /**
   * Subscribe to order changes (INSERT, UPDATE, DELETE)
   */
  subscribeToOrders(
    callback: (payload: RealtimeChangePayload) => void,
    filter?: SubscriptionFilter,
  ): string {
    return this.subscribeInternal("orders", callback, undefined, filter);
  }

  subscribeToDeliveries(
    callback: (payload: RealtimeChangePayload) => void,
    filter?: SubscriptionFilter,
  ): string {
    return this.subscribeInternal("deliveries", callback, undefined, filter);
  }

  subscribeToDrivers(
    callback: (payload: RealtimeChangePayload) => void,
    filter?: SubscriptionFilter,
  ): string {
    return this.subscribeInternal("drivers", callback, undefined, filter);
  }

  subscribeToDeliveryAssignments(
    callback: (payload: RealtimeChangePayload) => void,
    filter?: SubscriptionFilter,
  ): string {
    return this.subscribeInternal("delivery_assignments", callback, undefined, filter);
  }

  subscribeToOrder(orderId: string, callback: (payload: RealtimeChangePayload) => void): string {
    return this.subscribeInternal("orders", callback, undefined, {
      event: "UPDATE",
      filter: `id=eq.${orderId}`,
    });
  }

  subscribeToDeliveryAssignment(
    assignmentId: string,
    callback: (payload: RealtimeChangePayload) => void,
  ): string {
    return this.subscribeInternal("delivery_assignments", callback, undefined, {
      event: "UPDATE",
      filter: `id=eq.${assignmentId}`,
    });
  }

  subscribeToDriver(driverId: string, callback: (payload: RealtimeChangePayload) => void): string {
    return this.subscribeInternal("drivers", callback, undefined, {
      event: "UPDATE",
      filter: `id=eq.${driverId}`,
    });
  }

  private subscribeInternal(
    type: SubscriptionType,
    callback: (payload: RealtimeChangePayload) => void,
    subscriptionId?: string,
    filter?: SubscriptionFilter,
  ): string {
    const channelKey = this.buildChannelKey(type, filter);
    const id = subscriptionId || `${channelKey}-${Date.now()}-${Math.random()}`;

    if (this.connectionState === "reconnecting") {
      if (this.isDevLogging()) {
        console.log(`[Realtime] subscribe deferred during reconnect: ${type} (${id})`);
      }
      return id;
    }

    if (this.subscriptions.has(id)) {
      this.unsubscribe(id, { suppressEvents: true });
    }

    let group = this.channelGroups.get(channelKey);
    if (!group) {
      const channel = this.createChannel(channelKey, type, filter);
      group = {
        channelKey,
        type,
        filter,
        channel,
        listenerIds: new Set(),
      };
      this.channelGroups.set(channelKey, group);
    }

    group.listenerIds.add(id);
    this.subscriptions.set(id, {
      id,
      type,
      channelKey,
      callback,
      filter,
    });

    if (this.isDevLogging()) {
      console.log(`[Realtime] Subscribed to ${type} with ID: ${id} (channel: ${channelKey})`);
    }

    return id;
  }

  unsubscribe(subscriptionId: string, options?: { suppressEvents?: boolean }): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    const group = this.channelGroups.get(subscription.channelKey);
    if (group) {
      group.listenerIds.delete(subscriptionId);

      if (group.listenerIds.size === 0) {
        const prevSuppress = this.suppressDisconnectedEvents;
        if (options?.suppressEvents) {
          this.suppressDisconnectedEvents = true;
        }

        try {
          supabase.removeChannel(group.channel);
        } finally {
          this.suppressDisconnectedEvents = prevSuppress;
        }

        this.channelGroups.delete(subscription.channelKey);
      }
    }

    this.subscriptions.delete(subscriptionId);

    if (this.isDevLogging()) {
      console.log(`[Realtime] Unsubscribed from ${subscription.type} with ID: ${subscriptionId}`);
    }
  }

  unsubscribeByType(type: SubscriptionType): void {
    const toRemove: string[] = [];

    this.subscriptions.forEach((sub, id) => {
      if (sub.type === type) {
        toRemove.push(id);
      }
    });

    toRemove.forEach((id) => this.unsubscribe(id, { suppressEvents: true }));
  }

  unsubscribeAll(): void {
    this.suppressDisconnectedEvents = true;
    try {
      for (const group of this.channelGroups.values()) {
        supabase.removeChannel(group.channel);
      }
      this.channelGroups.clear();
      this.subscriptions.clear();
    } finally {
      this.suppressDisconnectedEvents = false;
    }

    if (this.isDevLogging()) {
      console.log("[Realtime] Unsubscribed from all subscriptions");
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getActiveSubscriptionsCount(): number {
    return this.subscriptions.size;
  }

  getActiveChannelCount(): number {
    return this.channelGroups.size;
  }

  private getTableName(type: SubscriptionType): string {
    switch (type) {
      case "orders":
        return "orders";
      case "deliveries":
        return "delivery_assignments";
      case "drivers":
        return "drivers";
      case "delivery_assignments":
        return "delivery_assignments";
      default:
        throw new Error(`Unknown subscription type: ${type}`);
    }
  }
}

export const realtimeService = new RealtimeService();
