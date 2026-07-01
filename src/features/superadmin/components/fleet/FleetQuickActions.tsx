"use client";

import { toast } from "sonner";
import { Copy, ExternalLink, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SuperAdminFleetDriverDetails } from "@/features/superadmin/types/superadmin-fleet.types";

export function FleetQuickActions({
  driver,
  onRefresh,
  refreshing,
}: {
  driver: SuperAdminFleetDriverDetails | null;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const coords =
    driver?.location != null
      ? `${driver.location.lat.toFixed(6)}, ${driver.location.lng.toFixed(6)}`
      : null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!driver?.active_delivery}
        className="border-zinc-700 bg-zinc-900 text-zinc-300"
        onClick={() => {
          if (!driver?.active_delivery) return;
          window.open(`/track/${driver.active_delivery.order_id}`, "_blank", "noopener,noreferrer");
        }}
      >
        <Eye className="mr-2 h-4 w-4" />
        View Order
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!driver}
        className="border-zinc-700 bg-zinc-900 text-zinc-300"
        onClick={() => {
          if (!driver) return;
          window.open("/driver", "_blank", "noopener,noreferrer");
        }}
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        Open Driver
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!coords}
        className="border-zinc-700 bg-zinc-900 text-zinc-300"
        onClick={async () => {
          if (!coords) return;
          try {
            await navigator.clipboard.writeText(coords);
            toast.success("Coordinates copied");
          } catch {
            toast.error("Could not copy coordinates");
          }
        }}
      >
        <Copy className="mr-2 h-4 w-4" />
        Copy Coordinates
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-zinc-700 bg-zinc-900 text-zinc-300"
        onClick={onRefresh}
        disabled={refreshing}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        Refresh
      </Button>
    </div>
  );
}
