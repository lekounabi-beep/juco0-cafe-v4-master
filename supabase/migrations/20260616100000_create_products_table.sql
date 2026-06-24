-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  image TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================
-- STORE SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Insert default store settings
INSERT INTO store_settings (key, value) VALUES
  ('business_hours', '{
    "monday": {"open": "07:00", "close": "21:00"},
    "tuesday": {"open": "07:00", "close": "21:00"},
    "wednesday": {"open": "07:00", "close": "21:00"},
    "thursday": {"open": "07:00", "close": "21:00"},
    "friday": {"open": "07:00", "close": "21:00"},
    "saturday": {"open": "07:00", "close": "21:00"},
    "sunday": {"open": "07:00", "close": "21:00"}
  }'::jsonb),
  ('store_info', '{
    "name": "Juco",
    "address": "Nafpaktos, Greece",
    "phone": "+30 26340 00000",
    "instagram": "@juco.nafpaktos"
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);
-- ============================================
-- AUTO-UPDATE TIMESTAMP ON UPDATE
-- ============================================
CREATE TRIGGER products_update_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER store_settings_update_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE store_settings;
-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
-- Products: Allow public read access
CREATE POLICY "Allow public read products"
  ON products FOR SELECT
  TO anon
  USING (true);
-- Products: Allow authenticated read access
CREATE POLICY "Allow authenticated read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);
-- Products: Allow service role full access
CREATE POLICY "Allow service role full products"
  ON products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- Products: Allow authenticated users to insert/update/delete (admin only)
CREATE POLICY "Allow authenticated insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);
CREATE POLICY "Allow authenticated update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Allow authenticated delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);
-- Store Settings: Allow public read access
CREATE POLICY "Allow public read store_settings"
  ON store_settings FOR SELECT
  TO anon
  USING (true);
-- Store Settings: Allow authenticated read access
CREATE POLICY "Allow authenticated read store_settings"
  ON store_settings FOR SELECT
  TO authenticated
  USING (true);
-- Store Settings: Allow service role full access
CREATE POLICY "Allow service role full store_settings"
  ON store_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- Store Settings: Allow authenticated users to update (admin only)
CREATE POLICY "Allow authenticated update store_settings"
  ON store_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
