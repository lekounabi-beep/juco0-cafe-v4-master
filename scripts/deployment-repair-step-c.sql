-- Step C: Manual repair after Phase 1.5 (orphan policies + stale RPC grants)
DROP POLICY IF EXISTS "Allow anon insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read access" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.orders;
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow service role insert" ON public.orders;
DROP POLICY IF EXISTS "Allow service role update" ON public.orders;

REVOKE EXECUTE ON FUNCTION public.accept_delivery_atomic(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.transition_delivery_atomic(uuid, uuid, uuid, text) FROM anon, authenticated;

REVOKE INSERT ON public.orders FROM anon, authenticated;
REVOKE SELECT ON public.delivery_locations FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_order_for_tracking(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_delivery_assignment_for_order(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_delivery_location_history(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_latest_delivery_location(uuid) FROM anon, authenticated;
