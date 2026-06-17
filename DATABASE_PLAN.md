# Database Plan - Customer Account System

## Executive Summary

This document outlines the database schema changes required to implement the customer account system, including new tables, modifications to existing tables, RLS policies, indexes, and triggers.

---

## 1. New Tables

### 1.1 profiles Table

**Purpose:** Store user profile information linked to Supabase Auth users.

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
```

**Constraints:**
- `user_id` is UNIQUE and references `auth.users(id)`
- `ON DELETE CASCADE` ensures profile deletion when user is deleted
- `full_name`, `phone`, `email` are nullable for flexibility

**Triggers:**
```sql
-- Auto-update updated_at timestamp
CREATE TRIGGER profiles_update_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### 1.2 addresses Table

**Purpose:** Store saved delivery addresses for users.

```sql
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Other', -- Home, Work, Other
  address TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(user_id, is_default) WHERE is_default = true;
```

**Constraints:**
- `user_id` references `profiles(id)` with CASCADE delete
- `label` has default value 'Other'
- `is_default` ensures only one default address per user (enforced via trigger)

**Triggers:**
```sql
-- Auto-update updated_at timestamp
CREATE TRIGGER addresses_update_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Ensure only one default address per user
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

CREATE TRIGGER addresses_enforce_single_default
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_address();
```

### 1.3 favorite_orders Table

**Purpose:** Store user's favorite order for quick reordering.

```sql
CREATE TABLE IF NOT EXISTS favorite_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_favorite_orders_user_id ON favorite_orders(user_id);
```

**Constraints:**
- `user_id` is UNIQUE (one favorite order per user)
- `items` stores the cart items as JSONB (same structure as orders.items)

**Triggers:**
```sql
-- Auto-update updated_at timestamp
CREATE TRIGGER favorite_orders_update_updated_at
  BEFORE UPDATE ON favorite_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

---

## 2. Existing Table Modifications

### 2.1 orders Table

**Purpose:** Link orders to user accounts while maintaining guest order support.

**Add Column:**
```sql
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
```

**Indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id) WHERE user_id IS NOT NULL;
```

**Constraints:**
- `user_id` is nullable (guest orders have NULL)
- `ON DELETE SET NULL` preserves order if user is deleted
- Index only on non-null values for performance

**Migration Note:**
- Existing orders will have `user_id = NULL` (guest orders)
- No data loss or modification required

---

## 3. Row Level Security (RLS) Policies

### 3.1 profiles Table

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all profiles
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 3.2 addresses Table

```sql
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Users can read their own addresses
CREATE POLICY "Users can read own addresses"
  ON addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = addresses.user_id));

-- Users can insert their own addresses
CREATE POLICY "Users can insert own addresses"
  ON addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = addresses.user_id));

-- Users can update their own addresses
CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = addresses.user_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = addresses.user_id));

-- Users can delete their own addresses
CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = addresses.user_id));

-- Service role can manage all addresses
CREATE POLICY "Service role can manage addresses"
  ON addresses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 3.3 favorite_orders Table

```sql
ALTER TABLE favorite_orders ENABLE ROW LEVEL SECURITY;

-- Users can read their own favorite order
CREATE POLICY "Users can read own favorite order"
  ON favorite_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = favorite_orders.user_id));

-- Users can insert their own favorite order
CREATE POLICY "Users can insert own favorite order"
  ON favorite_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = favorite_orders.user_id));

-- Users can update their own favorite order
CREATE POLICY "Users can update own favorite order"
  ON favorite_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = favorite_orders.user_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = favorite_orders.user_id));

-- Users can delete their own favorite order
CREATE POLICY "Users can delete own favorite order"
  ON favorite_orders FOR DELETE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = favorite_orders.user_id));

-- Service role can manage all favorite orders
CREATE POLICY "Service role can manage favorite orders"
  ON favorite_orders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 3.4 orders Table (Modified)

```sql
-- Update existing policies to support user-specific orders

-- Users can read their own orders
CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR user_id IS NULL);

-- Users can insert orders (for their account or as guest)
CREATE POLICY "Users can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR user_id IS NULL);

-- Users can update their own orders (limited fields)
CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Keep existing anon policies for guest checkout
CREATE POLICY "Allow anon insert"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

-- Keep existing service role policies
CREATE POLICY "Service role can manage orders"
  ON orders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## 4. Triggers for Profile Auto-Creation

### 4.1 Profile Creation Trigger

**Purpose:** Automatically create a profile when a new user signs up via Supabase Auth.

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

**Note:** This trigger uses the user's email or name from metadata to populate the profile. If no name is provided, it uses the email prefix.

---

## 5. Data Types and Validation

### 5.1 profiles Table

| Column | Type | Constraints | Validation |
|--------|------|-------------|------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | UNIQUE, NOT NULL, FK | References auth.users |
| full_name | TEXT | NULLABLE | Max 100 chars |
| phone | TEXT | NULLABLE | Greek phone format |
| email | TEXT | NULLABLE | Valid email format |
| created_at | TIMESTAMPTZ | NOT NULL | Auto-generated |
| updated_at | TIMESTAMPTZ | NOT NULL | Auto-updated |

### 5.2 addresses Table

| Column | Type | Constraints | Validation |
|--------|------|-------------|------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | NOT NULL, FK | References profiles |
| label | TEXT | NOT NULL | Home/Work/Other |
| address | TEXT | NOT NULL | Max 500 chars |
| lat | NUMERIC | NULLABLE | Valid latitude |
| lng | NUMERIC | NULLABLE | Valid longitude |
| notes | TEXT | NULLABLE | Max 500 chars |
| is_default | BOOLEAN | NOT NULL | Default false |
| created_at | TIMESTAMPTZ | NOT NULL | Auto-generated |
| updated_at | TIMESTAMPTZ | NOT NULL | Auto-updated |

### 5.3 favorite_orders Table

| Column | Type | Constraints | Validation |
|--------|------|-------------|------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | UNIQUE, NOT NULL, FK | References profiles |
| items | JSONB | NOT NULL | Valid cart items |
| updated_at | TIMESTAMPTZ | NOT NULL | Auto-updated |

### 5.4 orders Table (Modified)

| Column | Type | Constraints | Validation |
|--------|------|-------------|------------|
| user_id | UUID | NULLABLE, FK | References profiles |

---

## 6. JSONB Structure for items

### 6.1 Cart Items Structure

```json
[
  {
    "name": "Espresso",
    "price": 2.50,
    "qty": 2,
    "category": "Coffee"
  },
  {
    "name": "Croissant",
    "price": 1.80,
    "qty": 1,
    "category": "Snacks"
  }
]
```

**Used in:**
- `orders.items`
- `favorite_orders.items`

**Validation:**
- Array of objects
- Each object has: name (string), price (number), qty (integer), category (string)
- Price must be >= 0
- Qty must be >= 1

---

## 7. Performance Optimization

### 7.1 Indexes Summary

| Table | Index | Purpose | Type |
|-------|-------|---------|------|
| profiles | idx_profiles_user_id | Fast user lookup | B-tree |
| profiles | idx_profiles_email | Email search (partial) | B-tree |
| addresses | idx_addresses_user_id | Fast address lookup | B-tree |
| addresses | idx_addresses_is_default | Default address lookup | B-tree (partial) |
| favorite_orders | idx_favorite_orders_user_id | Fast favorite lookup | B-tree |
| orders | idx_orders_user_id | User order history | B-tree (partial) |

### 7.2 Query Optimization

**User Orders Query:**
```sql
-- Optimized with index
SELECT * FROM orders
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20;
```

**Default Address Query:**
```sql
-- Optimized with partial index
SELECT * FROM addresses
WHERE user_id = $1 AND is_default = true;
```

**Profile Lookup:**
```sql
-- Optimized with unique index
SELECT * FROM profiles
WHERE user_id = $1;
```

---

## 8. Backup and Recovery

### 8.1 Backup Strategy

- Supabase automated backups (daily)
- Point-in-time recovery (30 days)
- Manual exports before major changes
- Schema versioning

### 8.2 Rollback Plan

If migration fails:
1. Restore from pre-migration backup
2. Revert application code
3. Test guest checkout functionality
4. Re-attempt migration with fixes

---

## 9. Migration Order

### Phase 1: Schema Creation
1. Create `profiles` table
2. Create `addresses` table
3. Create `favorite_orders` table
4. Add `user_id` to `orders` table

### Phase 2: Indexes and Triggers
1. Create all indexes
2. Create `update_updated_at` trigger (if not exists)
3. Create profile auto-creation trigger
4. Create single default address trigger

### Phase 3: RLS Policies
1. Enable RLS on all new tables
2. Create RLS policies for `profiles`
3. Create RLS policies for `addresses`
4. Create RLS policies for `favorite_orders`
5. Update RLS policies for `orders`

### Phase 4: Verification
1. Test profile creation via Supabase Auth
2. Test address CRUD operations
3. Test favorite order operations
4. Test order linking to users
5. Verify guest orders still work

---

## 10. Data Migration Considerations

### 10.1 Existing Orders

- No data migration required
- All existing orders will have `user_id = NULL`
- Guest orders continue to work
- Users can link past orders via registration flow

### 10.2 Future Data Linking

**Post-Order Registration Flow:**
1. User registers after guest order
2. System matches by email/phone
3. Updates `orders.user_id` if match found
4. Order appears in user's history

---

## 11. Security Considerations

### 11.1 SQL Injection Prevention

- Use parameterized queries (Supabase client)
- Never concatenate user input in SQL
- Validate all inputs before database operations

### 11.2 Data Privacy

- PII stored in `profiles` (email, phone, name)
- Addresses stored in `addresses` table
- RLS ensures users only access their own data
- GDPR compliance considerations

### 11.3 Access Control

- Authenticated users can access their own data
- Service role has full access (admin)
- Anon users can create guest orders only
- No public read access to user data

---

## 12. Testing Strategy

### 12.1 Unit Tests

- Test profile CRUD operations
- Test address CRUD operations
- Test favorite order operations
- Test order-user linking

### 12.2 Integration Tests

- Test auth flow with profile creation
- Test address management in checkout
- Test order history retrieval
- Test reorder functionality

### 12.3 Security Tests

- Test RLS policies
- Test unauthorized access attempts
- Test SQL injection prevention
- Test data isolation between users

---

## 13. Monitoring and Maintenance

### 13.1 Database Monitoring

- Monitor query performance
- Track index usage
- Monitor table sizes
- Alert on slow queries

### 13.2 Maintenance Tasks

- Regular vacuum and analyze
- Index rebuild if needed
- Archive old orders (future)
- Clean up orphaned records

---

## 14. Conclusion

This database plan provides a solid foundation for the customer account system while maintaining backward compatibility with guest orders. The schema is normalized, secure with RLS, and optimized for performance.

**Key Features:**
- Automatic profile creation via triggers
- Secure data isolation with RLS
- Optimized indexes for common queries
- Support for guest and authenticated orders
- Future-proof for additional features

**Next Steps:**
1. Review and approve database plan
2. Create Migration Plan
3. Execute migration in development environment
4. Test thoroughly before production deployment

---

*Generated: June 2026*
*Version: 1.0*
