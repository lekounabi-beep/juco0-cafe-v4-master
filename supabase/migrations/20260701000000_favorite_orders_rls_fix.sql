-- Fix favorite_orders RLS: restrict access to owning profile only.

DROP POLICY IF EXISTS "Users can read own favorite order" ON public.favorite_orders;
DROP POLICY IF EXISTS "Users can insert own favorite order" ON public.favorite_orders;
DROP POLICY IF EXISTS "Users can update own favorite order" ON public.favorite_orders;
DROP POLICY IF EXISTS "Users can delete own favorite order" ON public.favorite_orders;

CREATE POLICY "Users can read own favorite order"
  ON public.favorite_orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = (
      SELECT user_id FROM public.profiles WHERE id = favorite_orders.user_id
    )
  );

CREATE POLICY "Users can insert own favorite order"
  ON public.favorite_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.profiles WHERE id = favorite_orders.user_id
    )
  );

CREATE POLICY "Users can update own favorite order"
  ON public.favorite_orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = (
      SELECT user_id FROM public.profiles WHERE id = favorite_orders.user_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.profiles WHERE id = favorite_orders.user_id
    )
  );

CREATE POLICY "Users can delete own favorite order"
  ON public.favorite_orders FOR DELETE
  TO authenticated
  USING (
    auth.uid() = (
      SELECT user_id FROM public.profiles WHERE id = favorite_orders.user_id
    )
  );
