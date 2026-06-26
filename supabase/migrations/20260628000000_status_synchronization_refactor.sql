-- Status synchronization hardening.
-- 1) orders.status is kitchen-only for future writes.
-- 2) orders.delivery_status is a derived read model owned by DB functions/triggers.
-- 3) Driver accept is atomic: assignment + derived order fields + driver busy.
-- 4) Delivery milestones keep delivery_assignments as the progress source of truth.

-- ---------------------------------------------------------------------------
-- Guard: future order.status writes are kitchen-only.
-- Existing historical rows are not rewritten here; only changed/inserted values
-- are rejected when they leave the kitchen state set.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_orders_kitchen_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending', 'accepted', 'preparing', 'ready') THEN
      RAISE EXCEPTION 'orders.status is kitchen-only; invalid value %', NEW.status;
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status NOT IN ('pending', 'accepted', 'preparing', 'ready') THEN
      RAISE EXCEPTION 'orders.status is kitchen-only; invalid value %', NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_orders_kitchen_status ON public.orders;

CREATE TRIGGER guard_orders_kitchen_status
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_orders_kitchen_status();

-- ---------------------------------------------------------------------------
-- Guard: delivery_status is derived. Only trusted DB routines can update it by
-- setting a transaction-local flag before touching orders.delivery_status.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_orders_delivery_status_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.delivery_status, 'pending') <> 'pending'
      AND COALESCE(current_setting('app.delivery_status_write_owner', true), '') <> 'db'
    THEN
      RAISE EXCEPTION 'orders.delivery_status is derived and cannot be written directly';
    END IF;
  ELSIF NEW.delivery_status IS DISTINCT FROM OLD.delivery_status
    AND COALESCE(current_setting('app.delivery_status_write_owner', true), '') <> 'db'
  THEN
    RAISE EXCEPTION 'orders.delivery_status is derived and cannot be written directly';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_orders_delivery_status_owner ON public.orders;

CREATE TRIGGER guard_orders_delivery_status_owner
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_orders_delivery_status_owner();

-- ---------------------------------------------------------------------------
-- Derived delivery status from assignment timestamps.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_delivery_status(assignment_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT CASE
      WHEN cancelled_at IS NOT NULL THEN 'cancelled'
      WHEN delivered_at IS NOT NULL THEN 'delivered'
      WHEN arrived_at IS NOT NULL THEN 'arrived'
      WHEN started_delivery_at IS NOT NULL THEN 'in_transit'
      WHEN picked_up_at IS NOT NULL THEN 'picked_up'
      WHEN accepted_at IS NOT NULL OR assigned_at IS NOT NULL THEN 'assigned'
      ELSE 'pending'
    END
    FROM public.delivery_assignments
    WHERE id = assignment_id
  );
END;
$$;

-- Trigger owner for orders.delivery_status read-model sync.
CREATE OR REPLACE FUNCTION public.sync_delivery_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.delivery_status_write_owner', 'db', true);

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.orders
    SET
      delivery_status = public.get_delivery_status(NEW.id),
      driver_id = NEW.driver_id,
      updated_at = now()
    WHERE id = NEW.order_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.orders
    SET
      delivery_status = 'pending',
      driver_id = NULL,
      updated_at = now()
    WHERE id = OLD.order_id;
  END IF;

  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- Atomic driver accept: single DB transaction for assignment + derived order
-- fields + busy driver.
-- ---------------------------------------------------------------------------
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
  v_order public.orders%ROWTYPE;
  v_driver public.drivers%ROWTYPE;
  v_assignment public.delivery_assignments%ROWTYPE;
  v_active public.delivery_assignments%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF p_order_id IS NULL OR p_driver_id IS NULL THEN
    RAISE EXCEPTION 'order_id and driver_id are required';
  END IF;

  SELECT * INTO v_driver
  FROM public.drivers
  WHERE id = p_driver_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver % not found', p_driver_id;
  END IF;

  IF v_driver.is_active IS FALSE THEN
    RAISE EXCEPTION 'Driver is not active';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  SELECT * INTO v_active
  FROM public.delivery_assignments
  WHERE driver_id = p_driver_id
    AND delivered_at IS NULL
    AND cancelled_at IS NULL
  ORDER BY assigned_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND AND v_active.order_id IS DISTINCT FROM p_order_id THEN
    RAISE EXCEPTION 'Driver already has an active delivery';
  END IF;

  SELECT * INTO v_assignment
  FROM public.delivery_assignments
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_assignment.driver_id IS DISTINCT FROM p_driver_id THEN
      RAISE EXCEPTION 'Order already assigned to another driver';
    END IF;

    IF v_assignment.accepted_at IS NULL THEN
      UPDATE public.delivery_assignments
      SET accepted_at = v_now
      WHERE id = v_assignment.id
      RETURNING * INTO v_assignment;
    END IF;
  ELSE
    IF v_order.status IS DISTINCT FROM 'ready' THEN
      RAISE EXCEPTION 'Order is %, expected ready', v_order.status;
    END IF;

    IF v_order.driver_id IS NOT NULL THEN
      RAISE EXCEPTION 'Order already assigned to another driver';
    END IF;

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
  END IF;

  PERFORM set_config('app.delivery_status_write_owner', 'db', true);

  UPDATE public.orders
  SET
    delivery_status = 'assigned',
    driver_id = p_driver_id,
    updated_at = v_now
  WHERE id = p_order_id;

  UPDATE public.drivers
  SET
    availability_status = 'busy',
    updated_at = v_now
  WHERE id = p_driver_id;

  RETURN v_assignment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_delivery_atomic(uuid, uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Delivery milestone transition: assignment timestamps are the delivery truth.
-- orders.delivery_status remains derived through trigger/RPC-owned updates.
-- orders.status is intentionally not advanced beyond kitchen states.
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

  IF v_assignment.order_id IS DISTINCT FROM p_order_id THEN
    RAISE EXCEPTION 'Assignment % does not belong to order %', p_assignment_id, p_order_id;
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

  IF v_assignment.cancelled_at IS NOT NULL THEN
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

  IF (p_new_status = 'picked_up' AND v_assignment.picked_up_at IS NOT NULL)
    OR (p_new_status = 'in_transit' AND v_assignment.started_delivery_at IS NOT NULL)
    OR (p_new_status = 'arrived' AND v_assignment.arrived_at IS NOT NULL)
    OR (p_new_status = 'delivered' AND v_assignment.delivered_at IS NOT NULL)
  THEN
    RETURN;
  END IF;

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

  IF p_new_status = 'delivered' THEN
    UPDATE public.drivers
    SET availability_status = 'online', updated_at = v_now
    WHERE id = p_driver_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_delivery_atomic(uuid, uuid, uuid, text)
  TO service_role;
