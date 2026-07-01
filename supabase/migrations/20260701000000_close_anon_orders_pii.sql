-- Issue 1: Close anonymous access to orders (customer PII).
--
-- Background:
--   - "Drivers can view ready orders" (20260619000001) applies to ALL roles including anon.
--   - GRANT SELECT ON orders TO anon from initial + delivery migrations was never revoked.
--   - App reads orders only via service_role server actions (checkout, tracking, driver, admin).
--   - Authenticated customers retain SELECT on own rows via "Customers can view own orders".
--
-- Safe to apply idempotently on any environment that ran prior migrations.

-- ---------------------------------------------------------------------------
-- 1. Drop policies that expose order rows to anon (or overly broad SELECT)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Drivers can view ready orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view their order by id" ON public.orders;
DROP POLICY IF EXISTS "Allow public read access" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.orders;
DROP POLICY IF EXISTS "Allow anon read access" ON public.orders;

-- Legacy broad UPDATE policy (superseded by admin + service_role policies)
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;

-- ---------------------------------------------------------------------------
-- 2. Revoke table-level privileges — anon must have zero access to orders
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.orders FROM anon;

-- INSERT already revoked in phase 1.5; re-assert for idempotency
REVOKE INSERT ON TABLE public.orders FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Ensure authenticated + service_role retain required access
-- ---------------------------------------------------------------------------
GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

-- Policies that must remain (created in earlier migrations, not recreated here):
--   "Customers can view own orders"     — authenticated, user_id = auth.uid()
--   "Admins can view all orders"        — is_admin()
--   "Admins can update orders"          — is_admin()
--   "Service role can read all orders"
--   "Service role can update all orders"
--   "Service role can insert orders"
