"use client";

import { DriverProfileMenu } from "@/features/driver/components/DriverProfileMenu";
import { DRIVER_UI_STATE, type DriverUiState } from "../utils/derive-driver-ui-state";
import { DRIVER_AVAILABILITY } from "../types/delivery.types";

type DriverProfile = {
  full_name: string;
  vehicle_type: string;
};

interface DriverScreenHeaderProps {
  driverProfile: DriverProfile | null;
  uiState: DriverUiState;
  availabilityStatus: string;
  orderNumber?: string | number | null;
}

function HeaderStatus({ uiState }: { uiState: DriverUiState }) {
  if (uiState === DRIVER_UI_STATE.ONLINE_WAITING) {
    return (
      <span className="shrink-0 text-xs font-semibold text-green-400">
        <span aria-hidden>🟢</span> Ενεργός
      </span>
    );
  }

  if (uiState === DRIVER_UI_STATE.ACTIVE_DELIVERY) {
    return (
      <span className="shrink-0 text-xs font-semibold text-amber-400">
        <span aria-hidden>🟡</span> Σε διανομή
      </span>
    );
  }

  return null;
}

export function DriverScreenHeader({
  driverProfile,
  uiState,
  availabilityStatus,
  orderNumber,
}: DriverScreenHeaderProps) {
  const driverName = driverProfile?.full_name || "Οδηγός";
  const isOnDelivery = uiState === DRIVER_UI_STATE.ACTIVE_DELIVERY;
  const title = isOnDelivery && orderNumber != null ? `Παραγγελία #${orderNumber}` : driverName;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <DriverProfileMenu
            driverProfile={driverProfile}
            isOnDelivery={isOnDelivery}
            availabilityStatus={isOnDelivery ? DRIVER_AVAILABILITY.BUSY : availabilityStatus}
            hideStatusBadge
            minimal
          />
          <p className="truncate font-semibold text-white">{title}</p>
        </div>
        <HeaderStatus uiState={uiState} />
      </div>
    </header>
  );
}
