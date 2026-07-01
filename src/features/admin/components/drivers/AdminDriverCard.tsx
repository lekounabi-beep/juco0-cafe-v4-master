import { Eye, Pencil, Power } from "lucide-react";
import type { AdminDriverListItem } from "@/features/admin/types/admin-driver.types";
import { DriverStateBadge } from "./DriverStateBadge";

type AdminDriverCardProps = {
  driver: AdminDriverListItem;
  onView: (driverId: string) => void;
  onEdit: (driverId: string) => void;
  onToggleActive: (driverId: string, nextActive: boolean) => void;
  toggling?: boolean;
};

export function AdminDriverCard({
  driver,
  onView,
  onEdit,
  onToggleActive,
  toggling = false,
}: AdminDriverCardProps) {
  const hasLocation = driver.current_location_lat != null && driver.current_location_lng != null;

  return (
    <article className="glass rounded-2xl border border-white/10 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white">{driver.full_name}</h3>
          <p className="mt-0.5 truncate text-xs text-white/45">@{driver.username}</p>
        </div>
        <DriverStateBadge state={driver.operational_state} />
      </div>

      <div className="mt-3 space-y-1 text-sm text-white/60">
        {driver.active_order_number ? (
          <p>
            Παραγγελία{" "}
            <span className="font-medium text-white/80">#{driver.active_order_number}</span>
            {driver.active_delivery_status ? (
              <span className="text-white/45"> · {driver.active_delivery_status}</span>
            ) : null}
          </p>
        ) : (
          <p>Χωρίς ενεργή παράδοση</p>
        )}
        <p className="text-xs text-white/40">
          {hasLocation && driver.last_location_update
            ? `Τελευταία θέση: ${new Date(driver.last_location_update).toLocaleString("el-GR")}`
            : "Χωρίς πρόσφατη θέση GPS"}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onView(driver.id)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15"
        >
          <Eye className="h-3.5 w-3.5" />
          Προβολή
        </button>
        <button
          type="button"
          onClick={() => onEdit(driver.id)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15"
        >
          <Pencil className="h-3.5 w-3.5" />
          Επεξεργασία
        </button>
        <button
          type="button"
          disabled={toggling}
          onClick={() => onToggleActive(driver.id, !driver.is_active)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
        >
          <Power className="h-3.5 w-3.5" />
          {driver.is_active ? "Απενεργοποίηση" : "Ενεργοποίηση"}
        </button>
      </div>
    </article>
  );
}
