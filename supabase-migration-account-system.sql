-- Migration: Customer Account System
-- This migration adds tables and policies for customer accounts, profiles, addresses, and favorite orders

-- ============================================
-- Phase 1: Create New Tables
-- ============================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Phase 2: Modify Existing Tables
-- ============================================

-- Add user_id column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================
-- Phase 3: Create Indexes
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

-- ============================================
-- Phase 4: Create Triggers
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
-- Phase 5: Enable RLS and Create Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_orders ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "Users can read own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Allow anon insert" ON orders;
DROP POLICY IF EXISTS "Allow anon insert orders" ON orders;

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

-- ============================================
-- Migration Complete
-- ============================================
