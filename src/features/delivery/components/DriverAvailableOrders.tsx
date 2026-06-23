/**
 * Driver Available Orders Component
 * Displays available orders for drivers to accept
 */

import { Clock, Package } from 'lucide-react';
import { OrderCard } from './OrderCard';

type Order = {
  id: string;
  order_number: string;
  status: string;
  items: { name: string; qty: number }[];
  total: number;
  address: string;
  coords?: any;
  created_at: string;
};

interface DriverAvailableOrdersProps {
  availableOrders: Order[];
  onAcceptOrder: (orderId: string) => void;
  assignmentLoading: boolean;
}

export function DriverAvailableOrders({ availableOrders, onAcceptOrder, assignmentLoading }: DriverAvailableOrdersProps) {
  console.log('[DriverAvailableOrders] Render called');
  console.log('[DriverAvailableOrders] availableOrders:', availableOrders);
  console.log('[DriverAvailableOrders] availableOrders.length:', availableOrders.length);
  console.log('[DriverAvailableOrders] assignmentLoading:', assignmentLoading);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        Διαθέσιμες Παραγγελίες
      </h3>
      
      {availableOrders.length === 0 ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center backdrop-blur-sm">
          <Package className="h-12 w-12 text-white/40 mx-auto mb-3" />
          <p className="text-white/60">Δεν υπάρχουν διαθέσιμες παραγγελίες</p>
          <p className="text-sm text-white/40 mt-1">Περιμένετε για νέες παραγγελίες...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {availableOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAccept={() => onAcceptOrder(order.id)}
              loading={assignmentLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
