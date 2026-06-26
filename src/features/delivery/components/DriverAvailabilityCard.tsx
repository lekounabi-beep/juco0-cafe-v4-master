/**
 * Driver Availability Card Component
 * Allows drivers to toggle OFFLINE / ONLINE (BUSY is automatic during delivery)
 */

import { Loader2, Power } from 'lucide-react';
import { DRIVER_AVAILABILITY } from '../types/delivery.types';

interface DriverAvailabilityCardProps {
  isOnDelivery: boolean;
  availabilityStatus: string;
  availabilityLoading?: boolean;
  onAvailabilityChange: (newAvailability: string) => void;
}

export function DriverAvailabilityCard({
  isOnDelivery,
  availabilityStatus,
  availabilityLoading = false,
  onAvailabilityChange,
}: DriverAvailabilityCardProps) {
  if (isOnDelivery) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 backdrop-blur-sm">
          <p className="font-semibold text-amber-300">BUSY</p>
          <p className="text-xs text-white/60">Σε ενεργή παράδοση — η διαθεσιμότητα ενημερώνεται αυτόματα</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-white">Διαθεσιμότητα</p>
            <p className="text-xs text-white/60">
              {availabilityStatus === DRIVER_AVAILABILITY.ONLINE
                ? 'Λαμβάνετε παραγγελίες'
                : 'Δεν λαμβάνετε παραγγελίες'}
            </p>
          </div>
          <button
            disabled={availabilityLoading}
            onClick={() =>
              onAvailabilityChange(
                availabilityStatus === DRIVER_AVAILABILITY.ONLINE
                  ? DRIVER_AVAILABILITY.OFFLINE
                  : DRIVER_AVAILABILITY.ONLINE
              )
            }
            className={`relative h-12 w-12 rounded-full flex items-center justify-center transition disabled:opacity-60 ${
              availabilityStatus === DRIVER_AVAILABILITY.ONLINE
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {availabilityLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Power className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
