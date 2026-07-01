import type { FleetFilter } from "@/features/superadmin/types/superadmin-fleet.types";
import { cn } from "@/lib/utils";

const FILTERS: { id: FleetFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "online", label: "Online" },
  { id: "delivering", label: "Delivering" },
  { id: "offline", label: "Offline" },
  { id: "no_gps", label: "No GPS" },
];

export function FleetFilters({
  value,
  onChange,
}: {
  value: FleetFilter;
  onChange: (filter: FleetFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
            value === filter.id
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
