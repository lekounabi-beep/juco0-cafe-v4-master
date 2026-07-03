"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FleetFilters } from "@/features/superadmin/components/fleet/FleetFilters";
import { FleetDriverListItem } from "@/features/superadmin/components/fleet/FleetDriverListItem";
import type {
  FleetFilter,
  SuperAdminFleetDriver,
} from "@/features/superadmin/types/superadmin-fleet.types";

function matchesFilter(driver: SuperAdminFleetDriver, filter: FleetFilter): boolean {
  switch (filter) {
    case "online":
      return driver.operational_state === "online";
    case "delivering":
      return driver.operational_state === "delivering";
    case "offline":
      return driver.operational_state === "offline";
    case "no_gps":
      return !driver.gps_active;
    default:
      return true;
  }
}

function matchesSearch(driver: SuperAdminFleetDriver, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return (
    driver.full_name.toLowerCase().includes(q) ||
    (driver.phone?.toLowerCase().includes(q) ?? false) ||
    (driver.active_order_number?.toLowerCase().includes(q) ?? false) ||
    driver.id.toLowerCase().includes(q)
  );
}

export function FleetDriverList({
  drivers,
  loading,
  selectedId,
  onSelect,
}: {
  drivers: SuperAdminFleetDriver[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (driverId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FleetFilter>("all");

  const filtered = useMemo(
    () => drivers.filter((d) => matchesFilter(d, filter) && matchesSearch(d, query)),
    [drivers, filter, query],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, order..."
          className="border-zinc-800 bg-zinc-900 pl-9 text-zinc-100 placeholder:text-zinc-600"
        />
      </div>

      <FleetFilters value={filter} onChange={setFilter} />

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {loading && drivers.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">Loading drivers...</p>
        ) : filtered.length === 0 ? (
          <FleetEmptyState filter={filter} hasDrivers={drivers.length > 0} />
        ) : (
          filtered.map((driver) => (
            <FleetDriverListItem
              key={driver.id}
              driver={driver}
              selected={selectedId === driver.id}
              onSelect={() => onSelect(driver.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FleetEmptyState({ filter, hasDrivers }: { filter: FleetFilter; hasDrivers: boolean }) {
  if (!hasDrivers) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center">
        <p className="text-sm font-medium text-zinc-400">No drivers</p>
        <p className="mt-1 text-xs text-zinc-600">Create drivers from Store Admin.</p>
      </div>
    );
  }

  const message =
    filter === "online"
      ? "No online drivers"
      : filter === "delivering"
        ? "No drivers currently delivering"
        : filter === "offline"
          ? "No offline drivers"
          : filter === "no_gps"
            ? "All drivers have recent GPS"
            : "No drivers match your search";

  return (
    <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center">
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}
