-- Harden accept_delivery_atomic for production concurrency.
-- 1) Partial unique index: one open assignment per driver (DB guarantee).
-- 2) Lock order first, handle unique_violation, remove redundant orders UPDATE.
-- 3) orders.delivery_status / driver_id derived only via sync_delivery_status trigger.

CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_assignments_one_active_per_driver
  ON public.delivery_assignments (driver_id)
  WHERE delivered_at IS NULL AND cancelled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_assignments_open_by_order
  ON public.delivery_assignments (order_id)
  WHERE delivered_at IS NULL AND cancelled_at IS NULL;

CREATE OR REPLACE FUNCTION public.accept_delivery_atomic(
  p_order_id uuid,
  p_driver_id uuid
)
RETURNS public.delivery_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now           timestamptz := clock_timestamp();
  v_order         public.orders%ROWTYPE;
  v_driver        public.drivers%ROWTYPE;
  v_assignment    public.delivery_assignments%ROWTYPE;
  v_other_active  uuid;
BEGIN
  IF p_order_id IS NULL OR p_driver_id IS NULL THEN
    RAISE EXCEPTION 'order_id and driver_id are required'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_driver
  FROM public.drivers
  WHERE id = p_driver_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver % not found', p_driver_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_driver.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Driver is not active'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_assignment
  FROM public.delivery_assignments
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_assignment.driver_id = p_driver_id THEN
      IF v_assignment.cancelled_at IS NOT NULL THEN
        RAISE EXCEPTION 'Delivery is cancelled'
          USING ERRCODE = '22023';
      END IF;
      IF v_assignment.delivered_at IS NOT NULL THEN
        RAISE EXCEPTION 'Delivery already completed'
          USING ERRCODE = '22023';
      END IF;

      IF v_assignment.accepted_at IS NULL THEN
        UPDATE public.delivery_assignments
        SET accepted_at = v_now
        WHERE id = v_assignment.id
          AND accepted_at IS NULL
        RETURNING * INTO v_assignment;
      END IF;

      UPDATE public.drivers
      SET availability_status = 'busy', updated_at = v_now
      WHERE id = p_driver_id;

      RETURN v_assignment;
    END IF;

    RAISE EXCEPTION 'Order already assigned to another driver'
      USING ERRCODE = '23505';
  END IF;

  IF v_order.status IS DISTINCT FROM 'ready' THEN
    RAISE EXCEPTION 'Order is %, expected ready', v_order.status
      USING ERRCODE = '22023';
  END IF;

  IF v_order.driver_id IS NOT NULL
     AND v_order.driver_id IS DISTINCT FROM p_driver_id THEN
    RAISE EXCEPTION 'Order already assigned to another driver'
      USING ERRCODE = '23505';
  END IF;

  SELECT da.id INTO v_other_active
  FROM public.delivery_assignments da
  WHERE da.driver_id = p_driver_id
    AND da.delivered_at IS NULL
    AND da.cancelled_at IS NULL
    AND da.order_id <> p_order_id
  FOR UPDATE
  LIMIT 1;

  IF v_other_active IS NOT NULL THEN
    RAISE EXCEPTION 'Driver already has an active delivery'
      USING ERRCODE = '22023';
  END IF;

  BEGIN
    INSERT INTO public.delivery_assignments (
      order_id,
      driver_id,
      assigned_at,
      accepted_at
    )
    VALUES (
      p_order_id,
      p_driver_id,
      v_now,
      v_now
    )
    RETURNING * INTO v_assignment;

  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO v_assignment
      FROM public.delivery_assignments
      WHERE order_id = p_order_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Driver already has an active delivery'
          USING ERRCODE = '23505';
      END IF;

      IF v_assignment.driver_id IS DISTINCT FROM p_driver_id THEN
        RAISE EXCEPTION 'Order already assigned to another driver'
          USING ERRCODE = '23505';
      END IF;

      IF v_assignment.accepted_at IS NULL THEN
        UPDATE public.delivery_assignments
        SET accepted_at = v_now
        WHERE id = v_assignment.id
          AND accepted_at IS NULL
        RETURNING * INTO v_assignment;
      END IF;
  END;

  UPDATE public.drivers
  SET availability_status = 'busy', updated_at = v_now
  WHERE id = p_driver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver % not found after assignment', p_driver_id
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_assignment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_delivery_atomic(uuid, uuid)
  TO service_role;
