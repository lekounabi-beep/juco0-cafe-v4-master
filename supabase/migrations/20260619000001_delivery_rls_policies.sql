-- Delivery Module RLS Policies
-- Phase 1: Create Row Level Security policies for delivery tables

-- Enable RLS on all delivery tables
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_locations ENABLE ROW LEVEL SECURITY;
-- DRIVERS TABLE RLS POLICIES

-- Drivers can read their own profile
CREATE POLICY "Drivers can view own profile"
ON drivers FOR SELECT
USING (auth.uid() = user_id);
-- Drivers can update their own profile (availability, location)
CREATE POLICY "Drivers can update own profile"
ON drivers FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
-- Service role (admin) can read all drivers
CREATE POLICY "Service role can read all drivers"
ON drivers FOR SELECT
USING (auth.role() = 'service_role');
-- Service role can insert drivers
CREATE POLICY "Service role can insert drivers"
ON drivers FOR INSERT
WITH CHECK (auth.role() = 'service_role');
-- Service role can update all drivers
CREATE POLICY "Service role can update all drivers"
ON drivers FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
-- DELIVERY_ASSIGNMENTS TABLE RLS POLICIES

-- Drivers can read their own assignments
CREATE POLICY "Drivers can view own assignments"
ON delivery_assignments FOR SELECT
USING (auth.uid() IN (
  SELECT user_id FROM drivers WHERE id = driver_id
));
-- Drivers can update their own assignments (accept, pick up, etc.)
CREATE POLICY "Drivers can update own assignments"
ON delivery_assignments FOR UPDATE
USING (auth.uid() IN (
  SELECT user_id FROM drivers WHERE id = driver_id
))
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM drivers WHERE id = driver_id
));
-- Customers can read assignments for their own orders
CREATE POLICY "Customers can view own order assignments"
ON delivery_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = delivery_assignments.order_id
    AND orders.user_id = auth.uid()
  )
);
-- Service role can read all assignments
CREATE POLICY "Service role can read all assignments"
ON delivery_assignments FOR SELECT
USING (auth.role() = 'service_role');
-- Service role can insert assignments
CREATE POLICY "Service role can insert assignments"
ON delivery_assignments FOR INSERT
WITH CHECK (auth.role() = 'service_role');
-- Service role can update all assignments
CREATE POLICY "Service role can update all assignments"
ON delivery_assignments FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
-- DELIVERY_LOCATIONS TABLE RLS POLICIES

-- Drivers can read locations for their own assignments
CREATE POLICY "Drivers can view own assignment locations"
ON delivery_locations FOR SELECT
USING (auth.uid() IN (
  SELECT user_id FROM drivers WHERE id = driver_id
));
-- Drivers can insert their own location updates
CREATE POLICY "Drivers can insert own locations"
ON delivery_locations FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM drivers WHERE id = driver_id
));
-- Customers can read locations for their own orders
CREATE POLICY "Customers can view own order locations"
ON delivery_locations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM delivery_assignments
    JOIN orders ON orders.id = delivery_assignments.order_id
    WHERE delivery_assignments.id = delivery_locations.delivery_assignment_id
    AND orders.user_id = auth.uid()
  )
);
-- Service role can read all locations
CREATE POLICY "Service role can read all locations"
ON delivery_locations FOR SELECT
USING (auth.role() = 'service_role');
-- Service role can insert locations
CREATE POLICY "Service role can insert locations"
ON delivery_locations FOR INSERT
WITH CHECK (auth.role() = 'service_role');
-- ORDERS TABLE RLS POLICIES (Update for delivery fields)

-- Customers can read their own orders
CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT
USING (user_id = auth.uid());
-- Drivers can view ready orders (for delivery)
CREATE POLICY "Drivers can view ready orders"
ON orders FOR SELECT
USING (
  status = 'ready' 
  AND delivery_status = 'pending'
  AND driver_id IS NULL
);
-- Authenticated users can update orders (for admin dashboard)
CREATE POLICY "Authenticated users can update orders"
ON orders FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
-- Service role can read all orders
CREATE POLICY "Service role can read all orders"
ON orders FOR SELECT
USING (auth.role() = 'service_role');
-- Service role can update all orders
CREATE POLICY "Service role can update all orders"
ON orders FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
-- Service role can insert orders
CREATE POLICY "Service role can insert orders"
ON orders FOR INSERT
WITH CHECK (auth.role() = 'service_role');
-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
