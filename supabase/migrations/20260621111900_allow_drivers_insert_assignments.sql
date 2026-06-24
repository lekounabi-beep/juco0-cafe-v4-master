-- Allow drivers to insert delivery assignments
-- This fixes the RLS policy violation when drivers accept orders

-- Drop the restrictive service_role-only insert policy
DROP POLICY IF EXISTS "Service role can insert assignments" ON delivery_assignments;
-- Allow authenticated drivers to insert delivery assignments
CREATE POLICY "Drivers can insert assignments"
ON delivery_assignments FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM drivers WHERE id = driver_id
  )
);
-- Allow service role to insert assignments (for admin operations)
CREATE POLICY "Service role can insert assignments"
ON delivery_assignments FOR INSERT
WITH CHECK (auth.role() = 'service_role');
