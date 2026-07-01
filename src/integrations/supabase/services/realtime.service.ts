/**
 * Unified Realtime Service
 * Extends existing Supabase realtime implementation for orders and adds support for deliveries and drivers
 */

import { supabase } from '@/integrations/supabase/client';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export type SubscriptionType = 'orders' | 'deliveries' | 'drivers' | 'delivery_assignments';

type SubscriptionFilter = {
  event?: 'INSERT' | 'UPDATE' | 'DELETE';
  filter?: string;
};

export interface RealtimeSubscription {
  id: string;
  type: SubscriptionType;
  channel: ReturnType<typeof supabase.channel>;
  callback: (payload: unknown) => void;
  filter?: SubscriptionFilter;
}

const RECONNECT_SUBSCRIBE_TIMEOUT_MS = 15_000;

let reconnectInFlight: Promise<void> | null = null;
let reconnectGeneration = 0;

class RealtimeService {
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private connectionState: ConnectionState = 'disconnected';
  private suppressDisconnectedEvents = false;

  constructor() {
    this.setupConnectionMonitoring();
  }

  private setupConnectionMonitoring() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        void this.reconnectNow();
      });

      window.addEventListener('offline', () => {
        this.setConnectionState('disconnected');
      });
    }
  }

  private logRealtime(
    event:
      | 'reconnect_begin'
      | 'reconnect_skip_inflight'
      | 'reconnect_subscribe_start'
      | 'reconnect_subscribe_done'
      | 'reconnect_complete'
      | 'reconnect_failed',
    payload: Record<string, unknown> = {},
  ): void {
    console.info(`[Realtime] ${event}`, {
      generation: reconnectGeneration,
      phase: this.connectionState,
      ...payload,
    });
  }

  private setConnectionState(state: ConnectionState) {
    if (this.connectionState === state) return;
    this.connectionState = state;
    console.log(`[Realtime] Connection state: ${state}`);
  }

  reconnectNow(): Promise<void> {
    if (reconnectInFlight) {
      this.logRealtime('reconnect_skip_inflight', { reason: 'in_flight' });
      return reconnectInFlight;
    }

    if (this.connectionState === 'reconnecting') {
      this.logRealtime('reconnect_skip_inflight', { reason: 'already_reconnecting' });
      return Promise.resolve();
    }

    const generation = ++reconnectGeneration;
    this.logRealtime('reconnect_begin', { generation });

    reconnectInFlight = (async () => {
      try {
        this.setConnectionState('reconnecting');
        await this.reconnectAllSubscriptions(generation);
        this.setConnectionState('connected');
        this.logRealtime('reconnect_complete', { generation });
      } catch (err) {
        this.logRealtime('reconnect_failed', {
          generation,
          error: err instanceof Error ? err.message : String(err),
        });
        this.setConnectionState('disconnected');
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
      (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')
    ) {
      return;
    }

    if (status === 'SUBSCRIBED') {
      if (!this.suppressDisconnectedEvents) {
        this.setConnectionState('connected');
      }
      return;
    }

    if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      this.setConnectionState('disconnected');
    }
  }

  private async reconnectAllSubscriptions(generation: number): Promise<void> {
    if (this.subscriptions.size === 0) {
      return;
    }

    this.logRealtime('reconnect_subscribe_start', {
      generation,
      count: this.subscriptions.size,
    });

    const snapshot = Array.from(this.subscriptions.values()).map((sub) => ({
      id: sub.id,
      type: sub.type,
      callback: sub.callback,
      filter: sub.filter,
    }));

    this.suppressDisconnectedEvents = true;
    try {
      for (const sub of this.subscriptions.values()) {
        try {
          await supabase.removeChannel(sub.channel);
        } catch {
          // intentional teardown during reconnect
        }
      }

      const subscribePromises = snapshot.map((item) =>
        this.resubscribeOne(item.id, item.type, item.callback, item.filter),
      );

      await Promise.race([
        Promise.all(subscribePromises),
        new Promise<void>((_, reject) => {
          setTimeout(
            () => reject(new Error('reconnect_subscribe_timeout')),
            RECONNECT_SUBSCRIBE_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      this.suppressDisconnectedEvents = false;
    }

    this.logRealtime('reconnect_subscribe_done', { generation });
  }

  private resubscribeOne(
    id: string,
    type: SubscriptionType,
    callback: (payload: unknown) => void,
    filter?: SubscriptionFilter,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const tableName = this.getTableName(type);
      const channelName = `${type}-${id}`;

      const config: Record<string, string> = {
        event: filter?.event || '*',
        schema: 'public',
        table: tableName,
      };

      if (filter?.filter) {
        config.filter = filter.filter;
      }

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', config as never, (payload: unknown) => {
          callback(payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            resolve();
            return;
          }

          if (status === 'CHANNEL_ERROR') {
            reject(new Error(`channel_error:${id}`));
            return;
          }

          this.handleChannelStatus(status);
        });

      this.subscriptions.set(id, {
        id,
        type,
        channel,
        callback,
        filter,
      });
    });
  }

  /**
   * Subscribe to order changes (INSERT, UPDATE, DELETE)
   */
  subscribeToOrders(
    callback: (payload: unknown) => void,
    filter?: SubscriptionFilter,
  ): string {
    return this.subscribeInternal('orders', callback, undefined, filter);
  }

  subscribeToDeliveries(
    callback: (payload: unknown) => void,
    filter?: SubscriptionFilter,
  ): string {
    return this.subscribeInternal('deliveries', callback, undefined, filter);
  }

  subscribeToDrivers(
    callback: (payload: unknown) => void,
    filter?: SubscriptionFilter,
  ): string {
    return this.subscribeInternal('drivers', callback, undefined, filter);
  }

  subscribeToDeliveryAssignments(
    callback: (payload: unknown) => void,
    filter?: SubscriptionFilter,
  ): string {
    return this.subscribeInternal('delivery_assignments', callback, undefined, filter);
  }

  subscribeToOrder(orderId: string, callback: (payload: unknown) => void): string {
    return this.subscribeInternal('orders', callback, undefined, {
      event: 'UPDATE',
      filter: `id=eq.${orderId}`,
    });
  }

  subscribeToDeliveryAssignment(
    assignmentId: string,
    callback: (payload: unknown) => void,
  ): string {
    return this.subscribeInternal('delivery_assignments', callback, undefined, {
      event: 'UPDATE',
      filter: `id=eq.${assignmentId}`,
    });
  }

  subscribeToDriver(driverId: string, callback: (payload: unknown) => void): string {
    return this.subscribeInternal('drivers', callback, undefined, {
      event: 'UPDATE',
      filter: `id=eq.${driverId}`,
    });
  }

  private subscribeInternal(
    type: SubscriptionType,
    callback: (payload: unknown) => void,
    subscriptionId?: string,
    filter?: SubscriptionFilter,
  ): string {
    const id = subscriptionId || `${type}-${Date.now()}-${Math.random()}`;

    if (this.connectionState === 'reconnecting') {
      console.log(`[Realtime] subscribe deferred during reconnect: ${type} (${id})`);
      return id;
    }

    if (this.subscriptions.has(id)) {
      this.unsubscribe(id, { suppressEvents: true });
    }

    const tableName = this.getTableName(type);
    const channelName = `${type}-${id}`;

    const config: Record<string, string> = {
      event: filter?.event || '*',
      schema: 'public',
      table: tableName,
    };

    if (filter?.filter) {
      config.filter = filter.filter;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', config as never, (payload: unknown) => {
        console.log(`[Realtime] ${type} event:`, payload);
        callback(payload);
      })
      .subscribe((status) => {
        this.handleChannelStatus(status);
      });

    this.subscriptions.set(id, {
      id,
      type,
      channel,
      callback,
      filter,
    });
    console.log(`[Realtime] Subscribed to ${type} with ID: ${id}`);

    return id;
  }

  unsubscribe(subscriptionId: string, options?: { suppressEvents?: boolean }): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    const prevSuppress = this.suppressDisconnectedEvents;
    if (options?.suppressEvents) {
      this.suppressDisconnectedEvents = true;
    }

    try {
      supabase.removeChannel(subscription.channel);
    } finally {
      this.suppressDisconnectedEvents = prevSuppress;
    }

    this.subscriptions.delete(subscriptionId);
    console.log(`[Realtime] Unsubscribed from ${subscription.type} with ID: ${subscriptionId}`);
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
      this.subscriptions.forEach((sub) => {
        supabase.removeChannel(sub.channel);
      });
      this.subscriptions.clear();
    } finally {
      this.suppressDisconnectedEvents = false;
    }
    console.log('[Realtime] Unsubscribed from all subscriptions');
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getActiveSubscriptionsCount(): number {
    return this.subscriptions.size;
  }

  private getTableName(type: SubscriptionType): string {
    switch (type) {
      case 'orders':
        return 'orders';
      case 'deliveries':
        return 'delivery_assignments';
      case 'drivers':
        return 'drivers';
      case 'delivery_assignments':
        return 'delivery_assignments';
      default:
        throw new Error(`Unknown subscription type: ${type}`);
    }
  }
}

export const realtimeService = new RealtimeService();
