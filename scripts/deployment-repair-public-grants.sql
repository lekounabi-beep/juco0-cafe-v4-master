-- Fix: REVOKE FROM PUBLIC (anon inherits via PUBLIC in PostgreSQL)
REVOKE EXECUTE ON FUNCTION public.accept_delivery_atomic(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_delivery_atomic(uuid, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.transition_delivery_atomic(uuid, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_delivery_atomic(uuid, uuid, uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_order_for_tracking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_for_tracking(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_delivery_assignment_for_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_delivery_assignment_for_order(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_latest_delivery_location(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_latest_delivery_location(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_delivery_location_history(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_delivery_location_history(uuid) TO service_role;
