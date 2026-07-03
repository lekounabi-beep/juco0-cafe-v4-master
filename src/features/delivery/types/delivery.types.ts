/**
 * Delivery feature type definitions
 */

import type { Coordinates } from "@/shared/types/common.types";
import type { DriverOrderItem } from "./driver-order.types";

// Order Status Workflow
export const ORDER_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  PREPARING: "preparing",
  READY: "ready",
  ASSIGNED: "assigned",
  PICKED_UP: "picked_up",
  IN_TRANSIT: "in_transit",
  ARRIVED: "arrived",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// Delivery Status Workflow
export const DELIVERY_STATUS = {
  PENDING: "pending",
  ASSIGNED: "assigned",
  PICKED_UP: "picked_up",
  IN_TRANSIT: "in_transit",
  ARRIVED: "arrived",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type DeliveryStatus = (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

// Driver Availability States
export const DRIVER_AVAILABILITY = {
  ONLINE: "online",
  BUSY: "busy",
  OFFLINE: "offline",
} as const;

export type DriverAvailability = (typeof DRIVER_AVAILABILITY)[keyof typeof DRIVER_AVAILABILITY];

// Vehicle Types
export const VEHICLE_TYPE = {
  CAR: "car",
  MOTORCYCLE: "motorcycle",
  BICYCLE: "bicycle",
} as const;

export type VehicleType = (typeof VEHICLE_TYPE)[keyof typeof VEHICLE_TYPE];

// Driver Profile
export interface DriverProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  vehicle_type: VehicleType;
  vehicle_plate: string | null;
  availability_status: DriverAvailability;
  current_location_lat: number | null;
  current_location_lng: number | null;
  last_location_update: string | null;
  total_deliveries: number;
  rating: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Delivery Assignment
export interface DeliveryAssignment {
  id: string;
  order_id: string;
  driver_id: string;
  assigned_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  started_delivery_at: string | null;
  arrived_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

// Delivery Location (GPS tracking)
export interface DeliveryLocation {
  id: string;
  delivery_assignment_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
}

// Order with Delivery Info
export interface OrderWithDelivery {
  id: string;
  order_number: string;
  status: OrderStatus;
  delivery_status: DeliveryStatus;
  driver_id: string | null;
  estimated_delivery_eta: string | null;
  pickup_time: string | null;
  delivery_time: string | null;
  delivery_distance_km: number | null;
  delivery_notes: string | null;
  customer_name: string;
  customer_phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  total: number;
  items: DriverOrderItem[];
  created_at: string;
}

// Driver with Assignment
export interface DriverWithAssignment {
  driver: DriverProfile;
  assignment: DeliveryAssignment | null;
  current_order: OrderWithDelivery | null;
}

// Available Order for Driver
export interface AvailableOrder {
  id: string;
  order_number: string;
  customer_name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  total: number;
  items: DriverOrderItem[];
  created_at: string;
  distance_from_driver_km: number | null;
  estimated_pickup_time: string | null;
}

// Delivery Tracking Info (for customer)
export interface DeliveryTrackingInfo {
  order: OrderWithDelivery;
  driver: DriverProfile | null;
  current_location: Coordinates | null;
  eta_minutes: number | null;
  distance_km: number | null;
  last_location_update: string | null;
  timeline: DeliveryTimelineEvent[];
}

// Delivery Timeline Event
export interface DeliveryTimelineEvent {
  status: OrderStatus;
  label: string;
  timestamp: string | null;
  completed: boolean;
  icon: string;
}

// GPS Location Update
export interface GPSLocationUpdate {
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}

// ETA Calculation Result
export interface ETACalculation {
  eta_minutes: number;
  eta_timestamp: string;
  distance_km: number;
  average_speed_kmh: number;
}

// Driver Location Update Input
export interface DriverLocationUpdateInput {
  driver_id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

// Driver Availability Update Input
export interface DriverAvailabilityUpdateInput {
  driver_id: string;
  availability_status: DriverAvailability;
  current_location?: Coordinates;
}
