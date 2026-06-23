/**
 * Driver Header Component
 * Displays driver information and availability status
 */

import { User, Wifi, WifiOff } from 'lucide-react';
import { DRIVER_AVAILABILITY } from '../types/delivery.types';

type DriverProfile = {
  name: string;
  vehicle_type: string;
};

interface DriverHeaderProps {
  driverProfile: DriverProfile | null;
  availabilityStatus: string;
}

export function DriverHeader({ driverProfile, availabilityStatus }: DriverHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-white">{driverProfile?.name || 'Οδηγός'}</p>
            <p className="text-xs text-white/60">{driverProfile?.vehicle_type || 'Μέσο'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {availabilityStatus === DRIVER_AVAILABILITY.ONLINE ? (
            <div className="flex items-center gap-1 text-green-400">
              <Wifi className="h-4 w-4" />
              <span className="text-xs font-semibold">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-400">
              <WifiOff className="h-4 w-4" />
              <span className="text-xs font-semibold">Offline</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
