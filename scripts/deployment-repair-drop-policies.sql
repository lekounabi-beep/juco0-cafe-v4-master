DROP POLICY IF EXISTS "Allow anon insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read access" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.orders;
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow service role insert" ON public.orders;
DROP POLICY IF EXISTS "Allow service role update" ON public.orders;
