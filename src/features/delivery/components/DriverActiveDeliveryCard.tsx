/**
 * Driver Active Delivery Card Component
 * Displays the current active delivery with actions
 */

import { Package } from 'lucide-react';
import { DeliveryActions } from './DeliveryActions';

type Order = {
  order_number: string;
  address: string;
  total: number;
};

type DeliveryAssignment = {
  status: string;
  order_id: string;
  order?: Order;
};

interface DriverActiveDeliveryCardProps {
  activeDelivery: DeliveryAssignment;
  onDeliveryAction: (action: string) => void;
}

export function DriverActiveDeliveryCard({ activeDelivery, onDeliveryAction }: DriverActiveDeliveryCardProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="rounded-2xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-white">Ενεργή Παράδοση</h3>
        </div>
        
        {activeDelivery.order && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/80">Αριθμός Παραγγελίας</span>
              <span className="text-white font-semibold">#{activeDelivery.order.order_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/80">Διεύθυνση</span>
              <span className="text-white/60">{activeDelivery.order.address}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/80">Σύνολο</span>
              <span className="text-white font-semibold">{activeDelivery.order.total.toFixed(2)}€</span>
            </div>
            
            {/* Delivery Actions */}
            <div className="pt-3 border-t border-white/10">
              <DeliveryActions
                status={activeDelivery.status}
                onAction={onDeliveryAction}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
