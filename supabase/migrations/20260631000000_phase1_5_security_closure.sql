-- Phase 1.5: Security Closure — eliminate anon order creation, protect tracking, session revocation

-- ---------------------------------------------------------------------------
-- Session revocation (logout invalidates stolen cookies server-side)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.revoked_sessions (
  sid TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('admin', 'driver')),
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_revoked_sessions_revoked_at
  ON public.revoked_sessions (revoked_at);

ALTER TABLE public.revoked_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages revoked_sessions"
ON public.revoked_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Pending card checkouts (webhook completes orders without browser redirect)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkout_pending (
  viva_order_code TEXT PRIMARY KEY,
  checkout_token TEXT NOT NULL,
  client_request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_checkout_pending_expires
  ON public.checkout_pending (expires_at);

ALTER TABLE public.checkout_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages checkout_pending"
ON public.checkout_pending FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Auth rate limiting / lockouts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_lockouts (
  id TEXT PRIMARY KEY,
  failed_count INT NOT NULL DEFAULT 0,
  first_failure_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ
);

ALTER TABLE public.auth_lockouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages auth_lockouts"
ON public.auth_lockouts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- ORDERS: service_role INSERT only — no anon/authenticated bypass
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can create pending orders" ON public.orders;

REVOKE INSERT ON public.orders FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Drop conflicting legacy SELECT/UPDATE policies (superseded or insecure)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view their order by id" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;

-- ---------------------------------------------------------------------------
-- Tracking RPCs: service_role only (app gates via order_access cookie)
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_order_for_tracking(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_for_tracking(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_delivery_assignment_for_order(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_delivery_assignment_for_order(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_latest_delivery_location(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_delivery_location(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_delivery_location_history(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_delivery_location_history(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- delivery_locations: no anon reads (prevents GPS IDOR + realtime leak)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tracking can read delivery locations" ON public.delivery_locations;

REVOKE SELECT ON public.delivery_locations FROM anon, authenticated;

-- Realtime publication may still exist; without SELECT grant + policy, anon cannot read rows.

-- ---------------------------------------------------------------------------
-- Remove demo driver plaintext credentials (production-safe)
-- ---------------------------------------------------------------------------
UPDATE public.drivers
SET password = NULL
WHERE password IS NOT NULL;

ALTER TABLE public.drivers DROP COLUMN IF EXISTS password;

-- Ensure password_hash column exists (from phase1)
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS password_hash TEXT;
