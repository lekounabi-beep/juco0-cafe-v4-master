-- Enable Supabase Realtime for delivery_locations (required for postgres_changes).
-- Without publication membership, INSERT events never reach browser clients.

ALTER TABLE public.delivery_locations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'delivery_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_locations;
  END IF;
END $$;

-- Re-create insert RPC with execution notice for audit trail
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

  RAISE NOTICE 'GPS INSERT EXECUTED assignment=% driver=% lat=% lng=% id=%',
    p_assignment_id, p_driver_id, p_lat, p_lng, v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_driver_gps_location(
  uuid, uuid, numeric, numeric, numeric, numeric, numeric, timestamptz
) TO anon, authenticated, service_role;
