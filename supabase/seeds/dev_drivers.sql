-- Development-only driver credentials seed.
-- DO NOT run in production. Set driver passwords via admin tooling in prod.
--
-- Default dev passwords (change locally):
--   Driver A / 1
--   Driver B / 2
--
-- Hashes generated with bcrypt cost 12. Re-run scripts/seed-dev-drivers.mjs to regenerate.

INSERT INTO public.drivers (full_name, username, password_hash, phone, vehicle_type, availability_status, is_active)
VALUES
  (
    'Driver A',
    'Driver A',
    '$2b$12$.ztAq0DblDNnOgeIA4G1pu/RM0ayoXWLPz9s0sUR6GArt1Zs3pMx.',
    '0000000001',
    'motorcycle',
    'offline',
    true
  ),
  (
    'Driver B',
    'Driver B',
    '$2b$12$P6EteFS/KurODTXMI7/dI.mv316XmI60rOgCnABchdhmMQSAXCYqi',
    '0000000002',
    'motorcycle',
    'offline',
    true
  )
ON CONFLICT DO NOTHING;
