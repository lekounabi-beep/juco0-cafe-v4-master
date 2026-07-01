import type { AdminDriverSummary } from "@/features/admin/types/admin-driver.types";
import type { TrailPoint } from "@/features/live-tracking-v2/utils/driver-trail-geojson";

export type SuperAdminFleetDriver = {
  id: string;
  full_name: string;
  username: string;
  phone: string | null;
  vehicle_type: string | null;
  availability_status: string;
  is_active: boolean;
  operational_state: "inactive" | "offline" | "online" | "delivering";
  last_location_update: string | null;
  current_location_lat: number | null;
  current_location_lng: number | null;
  active_assignment_id: string | null;
  active_order_number: string | null;
  active_delivery_status: string | null;
  created_at: string;
  gps_active: boolean;
  gps_stale: boolean;
  gps_age_ms: number | null;
  no_gps: boolean;
};

export type SuperAdminFleetSummary = AdminDriverSummary & {
  gps_active: number;
  gps_stale: number;
  no_gps: number;
  last_fleet_update: string | null;
};

export type SuperAdminFleetLocation = {
  lat: number;
  lng: number;
  recorded_at: string;
  source: "assignment" | "profile";
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
};

export type SuperAdminFleetDelivery = {
  assignment_id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  address: string;
  status: string;
  destination_lat: number | null;
  destination_lng: number | null;
  payment_method: string | null;
  order_delivery_status: string | null;
  eta_minutes: number | null;
};

export type SuperAdminFleetDriverDetails = SuperAdminFleetDriver & {
  location: SuperAdminFleetLocation | null;
  active_delivery: SuperAdminFleetDelivery | null;
  route_points: TrailPoint[];
};

export type SuperAdminFleetListResult =
  | { success: true; drivers: SuperAdminFleetDriver[]; summary: SuperAdminFleetSummary }
  | { success: false; error: string };

export type SuperAdminFleetDetailsResult =
  | { success: true; driver: SuperAdminFleetDriverDetails }
  | { success: false; error: string };

export type FleetFilter = "all" | "online" | "delivering" | "offline" | "no_gps";
