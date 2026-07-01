-- Phase 1: Critical security & production integrity

-- ---------------------------------------------------------------------------
-- Idempotency for order creation
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_request_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_request_id
  ON public.orders (client_request_id)
  WHERE client_request_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Driver password hashing (plaintext column retained for one-time migration)
-- ---------------------------------------------------------------------------
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ---------------------------------------------------------------------------
-- Limited public tracking RPC (no PII)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_order_for_tracking(uuid);

CREATE OR REPLACE FUNCTION public.get_order_for_tracking(order_uuid uuid)
RETURNS TABLE (
  id uuid,
  order_number text,
  status text,
  delivery_status text,
  driver_id uuid,
  items jsonb,
  subtotal numeric,
  delivery_fee numeric,
  total numeric,
  payment_method text,
  payment_status text,
  created_at timestamptz,
  customer_name text,
  customer_phone text,
  address text,
  address_notes text,
  lat double precision,
  lng double precision,
  notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.order_number,
    o.status,
    o.delivery_status,
    o.driver_id,
    o.items,
    o.subtotal,
    o.delivery_fee,
    o.total,
    o.payment_method,
    o.payment_status,
    o.created_at,
    NULL::text AS customer_name,
    NULL::text AS customer_phone,
    NULL::text AS address,
    NULL::text AS address_notes,
    NULL::double precision AS lat,
    NULL::double precision AS lng,
    NULL::text AS notes
  FROM public.orders o
  WHERE o.id = order_uuid
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_for_tracking(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- GPS writes: service_role only (driver session verified in server actions)
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.insert_driver_gps_location(
  uuid, uuid, numeric, numeric, numeric, numeric, numeric, timestamptz
) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.insert_driver_gps_location(
  uuid, uuid, numeric, numeric, numeric, numeric, numeric, timestamptz
) TO service_role;

-- ---------------------------------------------------------------------------
-- Atomic admin kitchen status transition (optimistic concurrency)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_transition_order_status_atomic(
  p_order_id uuid,
  p_expected_status text,
  p_new_status text
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.orders%ROWTYPE;
BEGIN
  UPDATE public.orders
  SET status = p_new_status,
      updated_at = clock_timestamp()
  WHERE id = p_order_id
    AND status = p_expected_status
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not in expected status %', p_order_id, p_expected_status
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_transition_order_status_atomic(uuid, text, text)
  TO service_role;
