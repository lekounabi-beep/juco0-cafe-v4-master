-- Phase 4: Production security hardening
-- Fixes permissive RLS, adds admin role table, safe tracking RPCs

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS viva_transaction_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_viva_transaction_id
  ON public.orders(viva_transaction_id)
  WHERE viva_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.admin_emails (
  email TEXT PRIMARY KEY
);
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages admin_emails"
ON public.admin_emails FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Admin helper (matches JWT email to admin_emails table)
-- Insert your admin email: INSERT INTO admin_emails (email) VALUES ('you@example.com');
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails
    WHERE lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- ---------------------------------------------------------------------------
-- Safe tracking RPCs (guest tracking without exposing all orders)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_order_for_tracking(order_uuid uuid)
RETURNS SETOF public.orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.orders WHERE id = order_uuid LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_for_tracking(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_delivery_assignment_for_order(p_order_id uuid)
RETURNS SETOF public.delivery_assignments
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT da.*
  FROM public.delivery_assignments da
  WHERE da.order_id = p_order_id
  ORDER BY da.assigned_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_assignment_for_order(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_latest_delivery_location(p_assignment_id uuid)
RETURNS SETOF public.delivery_locations
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dl.*
  FROM public.delivery_locations dl
  WHERE dl.delivery_assignment_id = p_assignment_id
  ORDER BY dl.recorded_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_delivery_location(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- ORDERS: drop insecure policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view their order by id" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;

CREATE POLICY "Public can create pending orders"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (
  payment_status = 'pending'
  AND status = 'pending'
);

CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- PRODUCTS / STORE SETTINGS: admin-only writes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated insert products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated update products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated delete products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated update store_settings" ON public.store_settings;

CREATE POLICY "Admins can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update products"
ON public.products FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update store_settings"
ON public.store_settings FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- DELIVERY: tighten driver insert policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Drivers can insert assignments" ON public.delivery_assignments;

CREATE POLICY "Drivers can insert assignments for ready orders"
ON public.delivery_assignments FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.drivers WHERE id = driver_id)
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND o.status = 'ready'
      AND o.delivery_status = 'pending'
      AND o.driver_id IS NULL
  )
);

DROP POLICY IF EXISTS "Drivers can insert own locations" ON public.delivery_locations;

CREATE POLICY "Drivers can insert own assignment locations"
ON public.delivery_locations FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.drivers WHERE id = driver_id)
  AND EXISTS (
    SELECT 1 FROM public.delivery_assignments da
    WHERE da.id = delivery_assignment_id
      AND da.driver_id = delivery_locations.driver_id
  )
);

-- Realtime tracking: allow SELECT on locations for assignments linked to orders
CREATE POLICY "Tracking can read delivery locations"
ON public.delivery_locations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_assignments da
    WHERE da.id = delivery_assignment_id
  )
);
