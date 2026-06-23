/**
 * Unified Realtime Service
 * Extends existing Supabase realtime implementation for orders and adds support for deliveries and drivers
 */

import { supabase } from '@/integrations/supabase/client';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export type SubscriptionType = 'orders' | 'deliveries' | 'drivers' | 'delivery_assignments';

export interface RealtimeSubscription {
  id: string;
  type: SubscriptionType;
  channel: any;
  callback: (payload: any) => void;
}

class RealtimeService {
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupConnectionMonitoring();
  }

  private setupConnectionMonitoring() {
    // Monitor connection state
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.handleReconnect();
      });

      window.addEventListener('offline', () => {
        this.setConnectionState('disconnected');
      });
    }
  }

  private setConnectionState(state: ConnectionState) {
    this.connectionState = state;
    console.log(`[Realtime] Connection state: ${state}`);
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Realtime] Max reconnection attempts reached');
      return;
    }

    this.setConnectionState('reconnecting');
    this.reconnectAttempts++;

    setTimeout(() => {
      this.reconnectAllSubscriptions();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private reconnectAllSubscriptions() {
    console.log('[Realtime] Reconnecting all subscriptions...');
    
    // Resubscribe to all active subscriptions
    this.subscriptions.forEach((sub, id) => {
      this.subscribeInternal(sub.type, sub.callback, id);
    });

    this.setConnectionState('connected');
    this.reconnectAttempts = 0;
  }

  /**
   * Subscribe to order changes (INSERT, UPDATE, DELETE)
   */
  subscribeToOrders(
    callback: (payload: any) => void,
    filter?: { event?: 'INSERT' | 'UPDATE' | 'DELETE'; filter?: string }
  ): string {
    return this.subscribeInternal('orders', callback, undefined, filter);
  }

  /**
   * Subscribe to delivery changes (INSERT, UPDATE, DELETE)
   */
  subscribeToDeliveries(
    callback: (payload: any) => void,
    filter?: { event?: 'INSERT' | 'UPDATE' | 'DELETE'; filter?: string }
  ): string {
    return this.subscribeInternal('deliveries', callback, undefined, filter);
  }

  /**
   * Subscribe to driver changes (INSERT, UPDATE, DELETE)
   */
  subscribeToDrivers(
    callback: (payload: any) => void,
    filter?: { event?: 'INSERT' | 'UPDATE' | 'DELETE'; filter?: string }
  ): string {
    return this.subscribeInternal('drivers', callback, undefined, filter);
  }

  /**
   * Subscribe to delivery assignment changes (INSERT, UPDATE, DELETE)
   */
  subscribeToDeliveryAssignments(
    callback: (payload: any) => void,
    filter?: { event?: 'INSERT' | 'UPDATE' | 'DELETE'; filter?: string }
  ): string {
    return this.subscribeInternal('delivery_assignments', callback, undefined, filter);
  }

  /**
   * Subscribe to a specific order by ID
   */
  subscribeToOrder(orderId: string, callback: (payload: any) => void): string {
    return this.subscribeInternal('orders', callback, undefined, {
      event: 'UPDATE',
      filter: `id=eq.${orderId}`,
    });
  }

  /**
   * Subscribe to a specific delivery assignment by ID
   */
  subscribeToDeliveryAssignment(assignmentId: string, callback: (payload: any) => void): string {
    return this.subscribeInternal('delivery_assignments', callback, undefined, {
      event: 'UPDATE',
      filter: `id=eq.${assignmentId}`,
    });
  }

  /**
   * Subscribe to a specific driver by ID
   */
  subscribeToDriver(driverId: string, callback: (payload: any) => void): string {
    return this.subscribeInternal('drivers', callback, undefined, {
      event: 'UPDATE',
      filter: `id=eq.${driverId}`,
    });
  }

  /**
   * Internal subscription method
   */
  private subscribeInternal(
    type: SubscriptionType,
    callback: (payload: any) => void,
    subscriptionId?: string,
    filter?: { event?: 'INSERT' | 'UPDATE' | 'DELETE'; filter?: string }
  ): string {
    const id = subscriptionId || `${type}-${Date.now()}-${Math.random()}`;

    // Unsubscribe existing subscription with same ID
    if (this.subscriptions.has(id)) {
      this.unsubscribe(id);
    }

    const tableName = this.getTableName(type);
    const channelName = `${type}-${id}`;

    const config: any = {
      event: filter?.event || '*',
      schema: 'public',
      table: tableName,
    };

    if (filter?.filter) {
      config.filter = filter.filter;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', config, (payload: any) => {
        console.log(`[Realtime] ${type} event:`, payload);
        callback(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.setConnectionState('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.setConnectionState('disconnected');
        }
      });

    const subscription: RealtimeSubscription = {
      id,
      type,
      channel,
      callback,
    };

    this.subscriptions.set(id, subscription);
    console.log(`[Realtime] Subscribed to ${type} with ID: ${id}`);

    return id;
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      supabase.removeChannel(subscription.channel);
      this.subscriptions.delete(subscriptionId);
      console.log(`[Realtime] Unsubscribed from ${subscription.type} with ID: ${subscriptionId}`);
    }
  }

  /**
   * Unsubscribe from all subscriptions of a specific type
   */
  unsubscribeByType(type: SubscriptionType): void {
    const toRemove: string[] = [];
    
    this.subscriptions.forEach((sub, id) => {
      if (sub.type === type) {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => this.unsubscribe(id));
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((sub, id) => {
      supabase.removeChannel(sub.channel);
    });
    this.subscriptions.clear();
    console.log('[Realtime] Unsubscribed from all subscriptions');
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get table name from subscription type
   */
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

// Export singleton instance
export const realtimeService = new RealtimeService();
