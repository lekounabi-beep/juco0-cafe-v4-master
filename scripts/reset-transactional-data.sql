-- Production-safe transactional reset (testing only).
-- Clears orders + delivery state. Preserves schema, RPCs, triggers, drivers, products, admin.

BEGIN;

DELETE FROM public.delivery_locations;
DELETE FROM public.delivery_assignments;
DELETE FROM public.orders;

UPDATE public.drivers
SET availability_status = 'offline',
    updated_at = now();

COMMIT;

-- Verification (must all be zero / offline)
SELECT 'orders' AS table_name, count(*) AS row_count FROM public.orders
UNION ALL
SELECT 'delivery_assignments', count(*) FROM public.delivery_assignments
UNION ALL
SELECT 'delivery_locations', count(*) FROM public.delivery_locations
UNION ALL
SELECT 'drivers', count(*) FROM public.drivers;
