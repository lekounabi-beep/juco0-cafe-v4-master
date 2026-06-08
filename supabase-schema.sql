-- ============================================
-- Juco Cafe & Juice Bar - Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  items JSONB NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  address_notes TEXT,
  lat NUMERIC,
  lng NUMERIC,
  notes TEXT,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  viva_transaction_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ORDER NUMBER AUTO-GENERATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  order_num TEXT;
  prefix TEXT := 'JU';
BEGIN
  LOOP
    order_num := prefix || LPAD((NEXTVAL('order_number_seq')::TEXT), 6, '0');
    IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = order_num) THEN
      RETURN order_num;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- ============================================
-- AUTO-GENERATE ORDER NUMBER ON INSERT
-- ============================================
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- ============================================
-- AUTO-UPDATE TIMESTAMP ON UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_update_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- ============================================
-- ENABLE REALTIME ON ORDERS TABLE
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access"
  ON orders FOR SELECT
  TO anon
  USING (true);

-- Allow service role to insert
CREATE POLICY "Allow service role insert"
  ON orders FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow anon users to insert
CREATE POLICY "Allow anon insert"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow service role to update
CREATE POLICY "Allow service role update"
  ON orders FOR UPDATE
  TO service_role
  WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read access"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated update access"
  ON orders FOR UPDATE
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- FEEDBACK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  phone TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Realtime on feedback table
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;

-- RLS for feedback
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert feedback"
  ON feedback FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated update feedback"
  ON feedback FOR UPDATE
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  'orders' as table_name,
  COUNT(*) as row_count
FROM orders
UNION ALL
SELECT 
  'feedback' as table_name,
  COUNT(*) as row_count
FROM feedback;

SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'feedback');
