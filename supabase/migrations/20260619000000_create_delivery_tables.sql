-- Delivery Module Database Schema
-- Phase 1: Create delivery-related tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  vehicle_type TEXT DEFAULT 'car', -- car, motorcycle, bicycle
  vehicle_plate TEXT,
  availability_status TEXT NOT NULL DEFAULT 'offline', -- online, busy, offline
  current_location_lat NUMERIC,
  current_location_lng NUMERIC,
  last_location_update TIMESTAMPTZ,
  total_deliveries INTEGER DEFAULT 0,
  rating NUMERIC CHECK (rating >= 0 AND rating <= 5),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on availability_status for quick queries
CREATE INDEX idx_drivers_availability ON drivers(availability_status);
CREATE INDEX idx_drivers_active ON drivers(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_drivers_user_id ON drivers(user_id);

-- Delivery assignments table (links orders to drivers)
CREATE TABLE IF NOT EXISTS delivery_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  started_delivery_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  UNIQUE(order_id) -- One driver per order
);

-- Create indexes for delivery assignments
CREATE INDEX idx_delivery_assignments_order ON delivery_assignments(order_id);
CREATE INDEX idx_delivery_assignments_driver ON delivery_assignments(driver_id);
CREATE INDEX idx_delivery_assignments_delivered_at ON delivery_assignments(delivered_at);
CREATE INDEX idx_delivery_assignments_arrived_at ON delivery_assignments(arrived_at);
CREATE INDEX idx_delivery_assignments_started_at ON delivery_assignments(started_delivery_at);
CREATE INDEX idx_delivery_assignments_picked_up_at ON delivery_assignments(picked_up_at);
CREATE INDEX idx_delivery_assignments_accepted_at ON delivery_assignments(accepted_at);

-- Delivery locations table (stores GPS tracking history)
CREATE TABLE IF NOT EXISTS delivery_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_assignment_id UUID NOT NULL REFERENCES delivery_assignments(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  accuracy NUMERIC, -- GPS accuracy in meters
  speed NUMERIC, -- Speed in km/h
  heading NUMERIC, -- Heading in degrees
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for delivery locations
CREATE INDEX idx_delivery_locations_assignment ON delivery_locations(delivery_assignment_id);
CREATE INDEX idx_delivery_locations_driver ON delivery_locations(driver_id);
CREATE INDEX idx_delivery_locations_recorded ON delivery_locations(recorded_at DESC);

-- Update orders table with delivery fields
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS estimated_delivery_eta TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pickup_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Create index on orders for delivery queries
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_delivery ON orders(status, delivery_status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate delivery status from delivery_assignments
CREATE OR REPLACE FUNCTION get_delivery_status(assignment_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT CASE
      WHEN delivered_at IS NOT NULL THEN 'delivered'
      WHEN arrived_at IS NOT NULL THEN 'arrived'
      WHEN started_delivery_at IS NOT NULL THEN 'in_transit'
      WHEN picked_up_at IS NOT NULL THEN 'picked_up'
      WHEN accepted_at IS NOT NULL THEN 'assigned'
      ELSE 'pending'
    END
    FROM delivery_assignments
    WHERE id = assignment_id
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync delivery status from delivery_assignments to orders
CREATE OR REPLACE FUNCTION sync_delivery_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE orders
    SET
      delivery_status = get_delivery_status(NEW.id),
      driver_id = NEW.driver_id,
      updated_at = NOW()
    WHERE id = NEW.order_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE orders
    SET
      delivery_status = 'pending',
      driver_id = NULL,
      updated_at = NOW()
    WHERE id = OLD.order_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_delivery_status
  AFTER INSERT OR UPDATE OR DELETE ON delivery_assignments
  FOR EACH ROW EXECUTE FUNCTION sync_delivery_status();

-- Function to update driver total deliveries
CREATE OR REPLACE FUNCTION update_driver_deliveries()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.delivered_at IS NOT NULL AND (OLD.delivered_at IS NULL OR TG_OP = 'INSERT') THEN
      UPDATE drivers
      SET total_deliveries = total_deliveries + 1
      WHERE id = NEW.driver_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_deliveries
  AFTER INSERT OR UPDATE ON delivery_assignments
  FOR EACH ROW EXECUTE FUNCTION update_driver_deliveries();
