-- Issue 2: Close anonymous access to delivery_assignments.
--
-- Background:
--   - "Tracking can read delivery assignments" (20260627000000) grants anon SELECT
--     when the parent order row exists — no ownership or access-token check.
--   - GRANT SELECT ON ALL TABLES TO anon (20260619000001) was never revoked for this table.
--   - App reads assignments only via service_role server actions:
--       tracking-delivery.ts, driver-delivery-sync.ts, driver-orders.ts
--   - get_delivery_assignment_for_order RPC is service_role only (phase 1.5).
--
-- Safe to apply idempotently on any environment that ran prior migrations.

-- ---------------------------------------------------------------------------
-- 1. Drop policy that exposes assignments to anon
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tracking can read delivery assignments" ON public.delivery_assignments;

-- ---------------------------------------------------------------------------
-- 2. Revoke table-level privileges — anon must have zero access
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.delivery_assignments FROM anon;

-- ---------------------------------------------------------------------------
-- 3. Ensure authenticated + service_role retain required access
-- ---------------------------------------------------------------------------
GRANT SELECT ON TABLE public.delivery_assignments TO authenticated;
GRANT ALL ON TABLE public.delivery_assignments TO service_role;

-- Policies that must remain (created in earlier migrations, not recreated here):
--   "Drivers can view own assignments"           — auth.uid() owns driver row
--   "Drivers can update own assignments"         — auth.uid() owns driver row
--   "Customers can view own order assignments"   — order.user_id = auth.uid()
--   "Drivers can insert assignments for ready orders" — superseded path; accept uses RPC
--   "Service role can read/insert/update all assignments"
