-- Device-login drivers use anon Supabase client (no auth.uid()).
-- Direct INSERT policies fail because WITH CHECK subqueries on delivery_assignments
-- are blocked by RLS on that table. Use SECURITY DEFINER functions instead.

-- ---------------------------------------------------------------------------
-- Helper: assignment exists (bypasses delivery_assignments RLS for policy checks)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delivery_assignment_exists(p_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.delivery_assignments da
    WHERE da.id = p_assignment_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.delivery_assignment_exists(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- INSERT: validated GPS write (device login safe)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_driver_gps_location(
  p_assignment_id uuid,
  p_driver_id uuid,
  p_lat numeric,
  p_lng numeric,
  p_accuracy numeric DEFAULT NULL,
  p_speed numeric DEFAULT NULL,
  p_heading numeric DEFAULT NULL,
  p_recorded_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_assignment_id IS NULL OR p_driver_id IS NULL THEN
    RAISE EXCEPTION 'assignment_id and driver_id are required';
  END IF;

  IF p_lat IS NULL OR p_lng IS NULL THEN
    RAISE EXCEPTION 'lat and lng are required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.delivery_assignments da
    WHERE da.id = p_assignment_id
      AND da.driver_id = p_driver_id
      AND da.delivered_at IS NULL
      AND da.cancelled_at IS NULL
  ) THEN
    RAISE EXCEPTION 'No active assignment % for driver %', p_assignment_id, p_driver_id;
  END IF;

  INSERT INTO public.delivery_locations (
    delivery_assignment_id,
    driver_id,
    lat,
    lng,
    accuracy,
    speed,
    heading,
    recorded_at
  )
  VALUES (
    p_assignment_id,
    p_driver_id,
    p_lat,
    p_lng,
    p_accuracy,
    p_speed,
    p_heading,
    COALESCE(p_recorded_at, now())
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_driver_gps_location(
  uuid, uuid, numeric, numeric, numeric, numeric, numeric, timestamptz
) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- SELECT: allow tracking reads for anon (driver PWA + customer track page)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tracking can read delivery locations" ON public.delivery_locations;

CREATE POLICY "Tracking can read delivery locations"
ON public.delivery_locations FOR SELECT
TO anon, authenticated
USING (public.delivery_assignment_exists(delivery_assignment_id));

-- Direct anon INSERT policy (subquery blocked by assignment RLS) — replaced by RPC
DROP POLICY IF EXISTS "Device drivers can insert assignment GPS" ON public.delivery_locations;

-- Realtime needs SELECT on the table for postgres_changes delivery
GRANT SELECT ON public.delivery_locations TO anon, authenticated;
