CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  name TEXT,
  phone TEXT,
  message TEXT NOT NULL CHECK (char_length(message) <= 2000),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.feedback TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback (anonymous visitors included)
CREATE POLICY "Anyone can insert feedback"
  ON public.feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No public SELECT — only service_role (backend admin) can read. Service role bypasses RLS.
-- Authenticated users explicitly cannot read either, until we add an admin role system.