import { Circle, Radio, Truck, UserX } from "lucide-react";
import type { AdminDriverSummary } from "@/features/admin/types/admin-driver.types";

type DriverSummaryCardsProps = {
  summary: AdminDriverSummary;
};

const CARDS = [
  {
    key: "online" as const,
    label: "Online",
    icon: Radio,
    accent: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    key: "delivering" as const,
    label: "Σε παράδοση",
    icon: Truck,
    accent: "text-orange-300 bg-orange-500/10 border-orange-500/20",
  },
  {
    key: "offline" as const,
    label: "Offline",
    icon: Circle,
    accent: "text-slate-300 bg-slate-500/10 border-slate-500/20",
  },
  {
    key: "inactive" as const,
    label: "Ανενεργοί",
    icon: UserX,
    accent: "text-white/50 bg-white/5 border-white/15",
  },
];

export function DriverSummaryCards({ summary }: DriverSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {CARDS.map(({ key, label, icon: Icon, accent }) => (
        <div key={key} className={`rounded-2xl border p-4 ${accent}`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</span>
            <Icon className="h-4 w-4 opacity-70" />
          </div>
          <p className="text-2xl font-semibold text-white">{summary[key]}</p>
        </div>
      ))}
    </div>
  );
}
