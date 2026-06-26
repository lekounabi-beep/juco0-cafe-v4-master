-- Phase 3: GPS / trail / realtime determinism.
-- 1) Full ordered trail history for refresh-safe reconstruction.
-- 2) Server-authoritative recorded_at (client timestamp is never trusted).

-- ---------------------------------------------------------------------------
-- SELECT: full ordered location history (ASC) for an assignment.
-- Replaces get_latest_delivery_location as the mount seed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_delivery_location_history(p_assignment_id uuid)
RETURNS SETOF public.delivery_locations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dl.*
  FROM public.delivery_locations dl
  WHERE dl.delivery_assignment_id = p_assignment_id
  ORDER BY dl.recorded_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_location_history(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- INSERT: recorded_at is DB authority ONLY. Client timestamp is ignored.
-- p_recorded_at is retained for signature compatibility but never used.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_driver_gps_location(
  p_assignment_id uuid,
  p_driver_id uuid,
  p_lat numeric,
  p_lng numeric,
  p_accuracy numeric DEFAULT NULL,
  p_speed numeric DEFAULT NULL,
  p_heading numeric DEFAULT NULL,
  p_recorded_at timestamptz DEFAULT NULL
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
    now()  -- DB authority only; p_recorded_at intentionally ignored
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_driver_gps_location(
  uuid, uuid, numeric, numeric, numeric, numeric, numeric, timestamptz
) TO anon, authenticated, service_role;
