/**
 * Driver Availability Card Component
 * Allows drivers to toggle their availability status
 */

import { Power } from 'lucide-react';
import { DRIVER_AVAILABILITY } from '../types/delivery.types';

interface DriverAvailabilityCardProps {
  availabilityStatus: string;
  onAvailabilityChange: (newAvailability: string) => void;
}

export function DriverAvailabilityCard({ availabilityStatus, onAvailabilityChange }: DriverAvailabilityCardProps) {
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
            onClick={() => onAvailabilityChange(
              availabilityStatus === DRIVER_AVAILABILITY.ONLINE 
                ? DRIVER_AVAILABILITY.OFFLINE 
                : DRIVER_AVAILABILITY.ONLINE
            )}
            className={`h-12 w-12 rounded-full flex items-center justify-center transition ${
              availabilityStatus === DRIVER_AVAILABILITY.ONLINE
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            <Power className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
