import type { SuperAdminFleetDriver } from "@/features/superadmin/types/superadmin-fleet.types";
import { DriverStateBadge } from "@/features/admin/components/drivers/DriverStateBadge";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

function driverInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatVehicle(vehicle: string | null): string {
  if (!vehicle) return "—";
  return vehicle.charAt(0).toUpperCase() + vehicle.slice(1);
}

function formatGpsAge(lastUpdate: string | null): string {
  if (!lastUpdate) return "No GPS";
  const ageMs = Date.now() - new Date(lastUpdate).getTime();
  if (ageMs < 60_000) return "Just now";
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export function FleetDriverListItem({
  driver,
  selected,
  onSelect,
}: {
  driver: SuperAdminFleetDriver;
  selected: boolean;
  onSelect: () => void;
}) {
  const hasCoords = driver.current_location_lat != null && driver.current_location_lng != null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition",
        selected
          ? "border-primary/40 bg-primary/10"
          : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200">
          {driverInitials(driver.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{driver.full_name}</p>
              <p className="truncate text-xs text-zinc-500">{formatVehicle(driver.vehicle_type)}</p>
            </div>
            <DriverStateBadge state={driver.operational_state} />
          </div>

          <div className="mt-2 space-y-1 text-xs text-zinc-500">
            {driver.active_order_number ? (
              <p>
                Order{" "}
                <span className="text-zinc-300">#{driver.active_order_number}</span>
                {driver.active_delivery_status ? (
                  <span className="text-zinc-600"> · {driver.active_delivery_status}</span>
                ) : null}
              </p>
            ) : (
              <p>No active delivery</p>
            )}
            <p className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {formatGpsAge(driver.last_location_update)}
              {driver.gps_active ? (
                <span className="text-emerald-500"> · live</span>
              ) : hasCoords ? (
                <span className="text-zinc-600"> · stale</span>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
