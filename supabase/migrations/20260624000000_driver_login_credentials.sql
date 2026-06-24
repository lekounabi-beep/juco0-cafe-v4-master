-- Driver login credentials (MVP device login, not Supabase Auth)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_username
  ON public.drivers(username)
  WHERE username IS NOT NULL;

-- Update existing rows named Driver A / Driver B (idempotent)
UPDATE public.drivers
SET username = 'Driver A', password = '1'
WHERE full_name = 'Driver A' AND (username IS DISTINCT FROM 'Driver A' OR password IS DISTINCT FROM '1');

UPDATE public.drivers
SET username = 'Driver B', password = '9'
WHERE full_name = 'Driver B' AND (username IS DISTINCT FROM 'Driver B' OR password IS DISTINCT FROM '9');

-- Insert Driver B if missing (Driver A is expected to exist or be renamed from admin-created row)
INSERT INTO public.drivers (full_name, username, password, phone, vehicle_type, availability_status, is_active)
SELECT 'Driver B', 'Driver B', '9', '0000000000', 'motorcycle', 'offline', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.drivers WHERE username = 'Driver B' OR full_name = 'Driver B'
);
