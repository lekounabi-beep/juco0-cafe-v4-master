-- Add coords column to orders table
-- This is required for delivery tracking to show destination on map

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS coords JSONB;
-- Add index for faster queries on coords
CREATE INDEX IF NOT EXISTS idx_orders_coords ON orders USING GIN (coords);
