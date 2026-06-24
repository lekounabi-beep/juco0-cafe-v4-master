-- Device-login drivers have no Supabase auth session (auth.uid() is null).
-- Allow GPS inserts when assignment + driver_id match an active (not finished) delivery.
-- delivery_assignments has no status column — active = delivered_at IS NULL AND cancelled_at IS NULL.
-- Superseded by 20260625100000_driver_gps_security_definer.sql (RPC insert).

DROP POLICY IF EXISTS "Device drivers can insert assignment GPS" ON public.delivery_locations;

CREATE POLICY "Device drivers can insert assignment GPS"
ON public.delivery_locations FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.delivery_assignments da
    WHERE da.id = delivery_assignment_id
      AND da.driver_id = delivery_locations.driver_id
      AND da.delivered_at IS NULL
      AND da.cancelled_at IS NULL
  )
);

GRANT INSERT ON public.delivery_locations TO anon, authenticated;
