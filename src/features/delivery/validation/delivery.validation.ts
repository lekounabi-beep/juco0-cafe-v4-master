/**
 * Delivery feature validation schemas using Zod
 */

import { z } from 'zod';
import type { DriverAvailability, VehicleType, DeliveryStatus } from '../types/delivery.types';

// Driver Availability Schema
export const driverAvailabilitySchema = z.enum(['online', 'busy', 'offline']) as z.ZodType<DriverAvailability>;

// Vehicle Type Schema
export const vehicleTypeSchema = z.enum(['car', 'motorcycle', 'bicycle']) as z.ZodType<VehicleType>;

// Delivery Status Schema
export const deliveryStatusSchema = z.enum(['pending', 'assigned', 'picked_up', 'in_transit', 'arrived', 'delivered', 'cancelled']) as z.ZodType<DeliveryStatus>;

// Create Driver Input Schema
export const createDriverInputSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  email: z.string().email('Invalid email address').optional().nullable(),
  vehicle_type: vehicleTypeSchema.optional(),
  vehicle_plate: z.string().optional().nullable(),
});

// Update Driver Availability Schema
export const updateDriverAvailabilitySchema = z.object({
  driver_id: z.string().uuid(),
  availability_status: driverAvailabilitySchema,
  current_location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

// Update Driver Location Schema
export const updateDriverLocationSchema = z.object({
  driver_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  speed: z.number().nonnegative().optional(),
  heading: z.number().min(0).max(360).optional(),
});

// Create Delivery Assignment Schema
export const createDeliveryAssignmentSchema = z.object({
  order_id: z.string().uuid(),
  driver_id: z.string().uuid(),
});

// Update Delivery Status Schema
export const updateDeliveryStatusSchema = z.object({
  assignment_id: z.string().uuid(),
  status: deliveryStatusSchema,
});

// Cancel Delivery Assignment Schema
export const cancelDeliveryAssignmentSchema = z.object({
  assignment_id: z.string().uuid(),
  cancellation_reason: z.string().max(500, 'Cancellation reason must be less than 500 characters').optional(),
});

// Record Driver Location Schema
export const recordDriverLocationSchema = z.object({
  assignment_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  speed: z.number().nonnegative().optional(),
  heading: z.number().min(0).max(360).optional(),
  timestamp: z.string().datetime().optional(),
});

// GPS Location Update Schema
export const gpsLocationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  speed: z.number().nonnegative().optional(),
  heading: z.number().min(0).max(360).optional(),
  timestamp: z.string().datetime().optional(),
});

// ETA Calculation Schema
export const etaCalculationSchema = z.object({
  distance_km: z.number().nonnegative(),
  average_speed_kmh: z.number().positive(),
});
