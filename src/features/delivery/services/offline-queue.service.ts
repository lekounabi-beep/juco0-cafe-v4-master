/**
 * Offline Queue Service for Driver PWA
 * Stores actions when offline and syncs when back online
 */

type QueueAction = {
  id: string;
  type: 'accept_order' | 'update_status' | 'update_location' | 'set_availability';
  payload: any;
  timestamp: number;
  retryCount: number;
};

class OfflineQueue {
  private queue: QueueAction[] = [];
  private isOnline: boolean = true;
  private isProcessing: boolean = false;
  private storageKey = 'driver_offline_queue';

  constructor() {
    this.loadQueue();
    this.setupNetworkListeners();
  }

  private setupNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[OfflineQueue] Network online');
        this.isOnline = true;
        this.processQueue();
      });

      window.addEventListener('offline', () => {
        console.log('[OfflineQueue] Network offline');
        this.isOnline = false;
      });

      this.isOnline = navigator.onLine;
    }
  }

  private loadQueue() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          this.queue = JSON.parse(stored);
          console.log('[OfflineQueue] Loaded queue:', this.queue.length, 'actions');
        }
      } catch (error) {
        console.error('[OfflineQueue] Failed to load queue:', error);
      }
    }
  }

  private saveQueue() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
      } catch (error) {
        console.error('[OfflineQueue] Failed to save queue:', error);
      }
    }
  }

  private async processAction(action: QueueAction): Promise<boolean> {
    const { supabase } = await import('@/integrations/supabase/client');

    try {
      switch (action.type) {
        case 'accept_order':
          // Accept order - update delivery_assignment status
          await supabase.from('delivery_assignments' as any).insert({
            order_id: action.payload.orderId,
            driver_id: action.payload.driverId,
            status: 'assigned',
            accepted_at: new Date().toISOString(),
          } as any);
          break;

        case 'update_status':
          // Update order status - type assertions until migrations run
          const { error: updateError } = await (supabase.from('orders' as any) as any)
            .update({ delivery_status: action.payload.status })
            .eq('id', action.payload.orderId);
          
          if (updateError) {
            console.error('[OfflineQueue] Update status error:', updateError);
            return false;
          }
          break;

        case 'update_location':
          // GPS location updates - store in delivery_locations table
          await supabase.from('delivery_locations' as any).insert({
            delivery_assignment_id: action.payload.deliveryId,
            driver_id: action.payload.driverId,
            lat: action.payload.latitude,
            lng: action.payload.longitude,
            accuracy: action.payload.accuracy,
            recorded_at: new Date().toISOString(),
          } as any);
          break;

        case 'set_availability':
          // Update driver availability - type assertions until migrations run
          const { error: availabilityError } = await (supabase.from('drivers' as any) as any)
            .update({ availability_status: action.payload.status })
            .eq('user_id', action.payload.userId);
          
          if (availabilityError) {
            console.error('[OfflineQueue] Update availability error:', availabilityError);
            return false;
          }
          break;

        default:
          console.warn('[OfflineQueue] Unknown action type:', action.type);
          return false;
      }

      return true;
    } catch (error) {
      console.error('[OfflineQueue] Failed to process action:', action.type, error);
      return false;
    }
  }

  private async processQueue() {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log('[OfflineQueue] Processing queue:', this.queue.length, 'actions');

    const failedActions: QueueAction[] = [];

    for (const action of this.queue) {
      const success = await this.processAction(action);

      if (success) {
        console.log('[OfflineQueue] Processed action:', action.type, action.id);
      } else {
        action.retryCount++;
        if (action.retryCount < 3) {
          failedActions.push(action);
          console.log('[OfflineQueue] Will retry action:', action.type, 'Retry:', action.retryCount);
        } else {
          console.error('[OfflineQueue] Action failed after 3 retries:', action.type);
        }
      }
    }

    this.queue = failedActions;
    this.saveQueue();
    this.isProcessing = false;

    if (this.queue.length > 0) {
      console.log('[OfflineQueue] Queue not empty, will retry later');
    }
  }

  addAction(type: QueueAction['type'], payload: any): string {
    const action: QueueAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(action);
    this.saveQueue();

    console.log('[OfflineQueue] Added action:', type, action.id);

    if (this.isOnline) {
      this.processQueue();
    }

    return action.id;
  }

  getQueueStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
    };
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
    console.log('[OfflineQueue] Queue cleared');
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();
