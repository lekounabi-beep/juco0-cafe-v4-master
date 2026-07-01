export type AdminDriverOperationalState = "inactive" | "offline" | "online" | "delivering";

export type AdminDriverListItem = {
  id: string;
  full_name: string;
  username: string;
  availability_status: string;
  is_active: boolean;
  operational_state: AdminDriverOperationalState;
  last_location_update: string | null;
  current_location_lat: number | null;
  current_location_lng: number | null;
  active_assignment_id: string | null;
  active_order_number: string | null;
  active_delivery_status: string | null;
  created_at: string;
};

export type AdminDriverSummary = {
  total: number;
  online: number;
  delivering: number;
  offline: number;
  inactive: number;
};

export type AdminDriverLocation = {
  lat: number;
  lng: number;
  recorded_at: string;
  source: "assignment" | "profile";
};

export type AdminDriverActiveDelivery = {
  assignment_id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  address: string;
  status: string;
  destination_lat: number | null;
  destination_lng: number | null;
};

export type AdminDriverDetails = AdminDriverListItem & {
  location: AdminDriverLocation | null;
  active_delivery: AdminDriverActiveDelivery | null;
};

export type AdminDriversListResult =
  | { success: true; drivers: AdminDriverListItem[]; summary: AdminDriverSummary }
  | { success: false; error: string };

export type AdminDriverDetailsResult =
  | { success: true; driver: AdminDriverDetails }
  | { success: false; error: string };

export type AdminDriverMutationResult = { success: true } | { success: false; error: string };

export type CreateDriverResult = { success: true; username: string } | { error: string };
