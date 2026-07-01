import type { AdminDriverOperationalState } from "@/features/admin/types/admin-driver.types";
import { adminDriverStateLabel } from "@/features/admin/utils/admin-driver-state";
import { cn } from "@/lib/utils";

const STATE_STYLES: Record<AdminDriverOperationalState, string> = {
  inactive: "bg-white/10 text-white/50 border-white/15",
  offline: "bg-slate-500/15 text-slate-200 border-slate-400/25",
  online: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
  delivering: "bg-orange-500/15 text-orange-200 border-orange-400/30",
};

type DriverStateBadgeProps = {
  state: AdminDriverOperationalState;
  className?: string;
};

export function DriverStateBadge({ state, className }: DriverStateBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATE_STYLES[state],
        className,
      )}
    >
      {adminDriverStateLabel(state)}
    </span>
  );
}
