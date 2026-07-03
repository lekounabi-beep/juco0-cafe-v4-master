/**
 * Driver Stats Card Component
 * Displays driver statistics and system status
 */

type DriverProfile = {
  total_deliveries: number;
};

interface DriverStatsCardProps {
  driverProfile: DriverProfile | null;
  isWakeLockActive: boolean;
}

export function DriverStatsCard({ driverProfile, isWakeLockActive }: DriverStatsCardProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{driverProfile?.total_deliveries || 0}</p>
            <p className="text-xs text-white/60">Συνολικές Παραδόσεις</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{isWakeLockActive ? "✓" : "-"}</p>
            <p className="text-xs text-white/60">Wake Lock</p>
          </div>
        </div>
      </div>
    </div>
  );
}
