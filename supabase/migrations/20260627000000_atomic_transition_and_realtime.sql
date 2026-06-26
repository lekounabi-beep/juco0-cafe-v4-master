-- Atomic delivery milestone transitions + assignment realtime for customer tracking.

-- ---------------------------------------------------------------------------
-- ATOMIC: assignment timestamp + orders.status in one transaction
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_delivery_atomic(
  p_order_id uuid,
  p_assignment_id uuid,
  p_driver_id uuid,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.delivery_assignments%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_current text;
  v_now timestamptz := now();
BEGIN
  IF p_order_id IS NULL OR p_assignment_id IS NULL OR p_driver_id IS NULL THEN
    RAISE EXCEPTION 'order_id, assignment_id and driver_id are required';
  END IF;

  IF p_new_status NOT IN ('picked_up', 'in_transit', 'arrived', 'delivered') THEN
    RAISE EXCEPTION 'Invalid status %', p_new_status;
  END IF;

  SELECT * INTO v_assignment
  FROM public.delivery_assignments
  WHERE id = p_assignment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment % not found', p_assignment_id;
  END IF;

  IF v_assignment.driver_id IS DISTINCT FROM p_driver_id THEN
    RAISE EXCEPTION 'Assignment does not belong to driver %', p_driver_id;
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_order.driver_id IS DISTINCT FROM p_driver_id THEN
    RAISE EXCEPTION 'Order not assigned to driver %', p_driver_id;
  END IF;

  IF v_assignment.cancelled_at IS NOT NULL OR v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Delivery is cancelled';
  END IF;

  v_current := CASE
    WHEN v_assignment.delivered_at IS NOT NULL THEN 'delivered'
    WHEN v_assignment.arrived_at IS NOT NULL THEN 'arrived'
    WHEN v_assignment.started_delivery_at IS NOT NULL THEN 'in_transit'
    WHEN v_assignment.picked_up_at IS NOT NULL THEN 'picked_up'
    WHEN v_assignment.accepted_at IS NOT NULL OR v_assignment.assigned_at IS NOT NULL THEN 'assigned'
    ELSE 'pending'
  END;

  -- Idempotent: already at or past target milestone.
  IF (p_new_status = 'picked_up' AND v_assignment.picked_up_at IS NOT NULL)
    OR (p_new_status = 'in_transit' AND v_assignment.started_delivery_at IS NOT NULL)
    OR (p_new_status = 'arrived' AND v_assignment.arrived_at IS NOT NULL)
    OR (p_new_status = 'delivered' AND v_assignment.delivered_at IS NOT NULL)
  THEN
    RETURN;
  END IF;

  -- Validate forward-only transitions (mirrors TS workflow).
  IF p_new_status = 'picked_up' AND v_current NOT IN ('assigned') THEN
    RAISE EXCEPTION 'Cannot pick up from status %', v_current;
  END IF;
  IF p_new_status = 'in_transit' AND v_current NOT IN ('assigned', 'picked_up') THEN
    RAISE EXCEPTION 'Cannot start transit from status %', v_current;
  END IF;
  IF p_new_status = 'arrived' AND v_current NOT IN ('assigned', 'picked_up', 'in_transit') THEN
    RAISE EXCEPTION 'Cannot arrive from status %', v_current;
  END IF;
  IF p_new_status = 'delivered' AND v_current NOT IN ('assigned', 'picked_up', 'in_transit', 'arrived') THEN
    RAISE EXCEPTION 'Cannot deliver from status %', v_current;
  END IF;

  CASE p_new_status
    WHEN 'picked_up' THEN
      UPDATE public.delivery_assignments SET picked_up_at = v_now WHERE id = p_assignment_id;
    WHEN 'in_transit' THEN
      UPDATE public.delivery_assignments SET started_delivery_at = v_now WHERE id = p_assignment_id;
    WHEN 'arrived' THEN
      UPDATE public.delivery_assignments SET arrived_at = v_now WHERE id = p_assignment_id;
    WHEN 'delivered' THEN
      UPDATE public.delivery_assignments SET delivered_at = v_now WHERE id = p_assignment_id;
  END CASE;

  UPDATE public.orders
  SET
    status = p_new_status,
    delivery_status = p_new_status,
    updated_at = v_now
  WHERE id = p_order_id;

  IF p_new_status = 'delivered' THEN
    UPDATE public.drivers
    SET availability_status = 'online', updated_at = v_now
    WHERE id = p_driver_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_delivery_atomic(uuid, uuid, uuid, text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- REALTIME: delivery_assignments milestone updates for customer track page
-- ---------------------------------------------------------------------------
ALTER TABLE public.delivery_assignments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'delivery_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_assignments;
  END IF;
END $$;

-- Anon guests on track page need SELECT for postgres_changes delivery.
DROP POLICY IF EXISTS "Tracking can read delivery assignments" ON public.delivery_assignments;

CREATE POLICY "Tracking can read delivery assignments"
ON public.delivery_assignments FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = delivery_assignments.order_id
  )
);
