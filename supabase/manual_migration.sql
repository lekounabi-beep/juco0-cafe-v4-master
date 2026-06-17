-- ============================================
-- COMPLETE MIGRATION: Customer Account System + Products/Store Settings
-- ============================================

-- ============================================
-- Phase 1: Create Customer Account Tables
-- ============================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Other',
  address TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create favorite_orders table
CREATE TABLE IF NOT EXISTS favorite_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Phase 2: Modify Existing Orders Table
-- ============================================

-- Add user_id column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================
-- Phase 3: Create Products and Store Settings Tables
-- ============================================

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create store_settings table
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- Phase 4: Create Indexes
-- ============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;

-- Addresses indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(user_id, is_default) WHERE is_default = true;

-- Favorite orders indexes
CREATE INDEX IF NOT EXISTS idx_favorite_orders_user_id ON favorite_orders(user_id);

-- Orders index
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id) WHERE user_id IS NOT NULL;

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);

-- ============================================
-- Phase 5: Create Triggers
-- ============================================

-- Ensure update_updated_at function exists
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at to all new tables
DROP TRIGGER IF EXISTS profiles_update_updated_at ON profiles;
CREATE TRIGGER profiles_update_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS addresses_update_updated_at ON addresses;
CREATE TRIGGER addresses_update_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS favorite_orders_update_updated_at ON favorite_orders;
CREATE TRIGGER favorite_orders_update_updated_at
  BEFORE UPDATE ON favorite_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS products_update_updated_at ON products;
CREATE TRIGGER products_update_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS store_settings_update_updated_at ON store_settings;
CREATE TRIGGER store_settings_update_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Single default address trigger
CREATE OR REPLACE FUNCTION enforce_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS addresses_enforce_single_default ON addresses;
CREATE TRIGGER addresses_enforce_single_default
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_address();

-- Profile auto-creation trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the user creation
  RAISE LOG 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Phase 6: Enable RLS and Create Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-runnable migration)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;

DROP POLICY IF EXISTS "Users can read own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;
DROP POLICY IF EXISTS "Service role can manage addresses" ON addresses;

DROP POLICY IF EXISTS "Users can read own favorite order" ON favorite_orders;
DROP POLICY IF EXISTS "Users can insert own favorite order" ON favorite_orders;
DROP POLICY IF EXISTS "Users can update own favorite order" ON favorite_orders;
DROP POLICY IF EXISTS "Users can delete own favorite order" ON favorite_orders;
DROP POLICY IF EXISTS "Service role can manage favorite orders" ON favorite_orders;

DROP POLICY IF EXISTS "Users can read own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Allow anon insert" ON orders;
DROP POLICY IF EXISTS "Allow anon insert orders" ON orders;

DROP POLICY IF EXISTS "Allow authenticated read products" ON products;
DROP POLICY IF EXISTS "Allow service role full products" ON products;
DROP POLICY IF EXISTS "Allow authenticated insert products" ON products;
DROP POLICY IF EXISTS "Allow authenticated update products" ON products;
DROP POLICY IF EXISTS "Allow authenticated delete products" ON products;

DROP POLICY IF EXISTS "Allow public read store_settings" ON store_settings;
DROP POLICY IF EXISTS "Allow authenticated read store_settings" ON store_settings;
DROP POLICY IF EXISTS "Allow service role full store_settings" ON store_settings;
DROP POLICY IF EXISTS "Allow authenticated update store_settings" ON store_settings;

-- Create RLS policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for addresses
CREATE POLICY "Users can read own addresses"
  ON addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = addresses.user_id));

CREATE POLICY "Users can insert own addresses"
  ON addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = addresses.user_id));

CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = addresses.user_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = addresses.user_id));

CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = addresses.user_id));

CREATE POLICY "Service role can manage addresses"
  ON addresses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for favorite_orders
CREATE POLICY "Users can read own favorite order"
  ON favorite_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own favorite order"
  ON favorite_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own favorite order"
  ON favorite_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own favorite order"
  ON favorite_orders FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage favorite orders"
  ON favorite_orders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update RLS policies for orders
CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR user_id IS NULL);

CREATE POLICY "Users can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR user_id IS NULL);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Allow anon insert orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create RLS policies for products
DROP POLICY IF EXISTS "Allow anon read products" ON products;
CREATE POLICY "Allow anon read products"
  ON products FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated read products" ON products;
CREATE POLICY "Allow authenticated read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert products" ON products;
CREATE POLICY "Allow anon insert products"
  ON products FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated insert products" ON products;
CREATE POLICY "Allow authenticated insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update products" ON products;
CREATE POLICY "Allow anon update products"
  ON products FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update products" ON products;
CREATE POLICY "Allow authenticated update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete products" ON products;
CREATE POLICY "Allow anon delete products"
  ON products FOR DELETE
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete products" ON products;
CREATE POLICY "Allow authenticated delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service role full products" ON products;
CREATE POLICY "Allow service role full products"
  ON products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for store_settings
DROP POLICY IF EXISTS "Allow public read store_settings" ON store_settings;
CREATE POLICY "Allow public read store_settings"
  ON store_settings FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated read store_settings" ON store_settings;
CREATE POLICY "Allow authenticated read store_settings"
  ON store_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service role full store_settings" ON store_settings;
CREATE POLICY "Allow service role full store_settings"
  ON store_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update store_settings" ON store_settings;
CREATE POLICY "Allow authenticated update store_settings"
  ON store_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Migration Complete
-- ============================================
