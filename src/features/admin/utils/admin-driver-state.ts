import type { AdminDriverOperationalState, AdminDriverSummary } from "../types/admin-driver.types";

type DriverStateInput = {
  is_active: boolean;
  availability_status: string;
  has_active_assignment: boolean;
};

export function deriveAdminDriverOperationalState(
  driver: DriverStateInput,
): AdminDriverOperationalState {
  if (!driver.is_active) return "inactive";
  if (driver.has_active_assignment || driver.availability_status === "busy") {
    return "delivering";
  }
  if (driver.availability_status === "online") return "online";
  return "offline";
}

export function buildAdminDriverSummary(
  drivers: { operational_state: AdminDriverOperationalState }[],
): AdminDriverSummary {
  const summary: AdminDriverSummary = {
    total: drivers.length,
    online: 0,
    delivering: 0,
    offline: 0,
    inactive: 0,
  };

  for (const driver of drivers) {
    summary[driver.operational_state] += 1;
  }

  return summary;
}

export function adminDriverStateLabel(state: AdminDriverOperationalState): string {
  switch (state) {
    case "inactive":
      return "Ανενεργός";
    case "offline":
      return "Offline";
    case "online":
      return "Online";
    case "delivering":
      return "Σε παράδοση";
    default:
      return state;
  }
}
