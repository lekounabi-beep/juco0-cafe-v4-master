'use client';

import { Loader2, Power } from 'lucide-react';
import { DriverAvailableOrders } from '../DriverAvailableOrders';
import { DRIVER_AVAILABILITY } from '../../types/delivery.types';
import type { DriverOrderDetails } from '../../types/driver-order.types';

interface OnlineWaitingViewProps {
  availableOrders: DriverOrderDetails[];
  availabilityLoading: boolean;
  assignmentLoading: boolean;
  acceptingOrderId: string | null;
  onAvailabilityChange: (newAvailability: string) => void;
  onAcceptOrder: (orderId: string) => void;
}

export function OnlineWaitingView({
  availableOrders,
  availabilityLoading,
  assignmentLoading,
  acceptingOrderId,
  onAvailabilityChange,
  onAcceptOrder,
}: OnlineWaitingViewProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          disabled={availabilityLoading}
          onClick={() => onAvailabilityChange(DRIVER_AVAILABILITY.OFFLINE)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {availabilityLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Power className="h-4 w-4" aria-hidden />
          )}
          ΤΕΛΟΣ ΒΑΡΔΙΑΣ
        </button>
      </div>

      <DriverAvailableOrders
        availableOrders={availableOrders}
        onAcceptOrder={onAcceptOrder}
        assignmentLoading={assignmentLoading}
        acceptingOrderId={acceptingOrderId}
      />
    </div>
  );
}
