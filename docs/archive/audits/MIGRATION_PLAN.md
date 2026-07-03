# Migration Plan - Customer Account System

## Executive Summary

This document outlines the step-by-step migration plan for implementing the customer account system, including database migrations, code changes, and deployment strategy.

---

## 1. Pre-Migration Checklist

### 1.1 Environment Preparation

- [ ] Create development database backup
- [ ] Create staging database backup
- [ ] Create production database backup
- [ ] Verify Supabase Auth is enabled in project
- [ ] Configure Google OAuth in Supabase
- [ ] Test Supabase connection
- [ ] Verify environment variables are set

### 1.2 Code Preparation

- [ ] Create feature branch for account system
- [ ] Update dependencies if needed
- [ ] Review current codebase for conflicts
- [ ] Prepare rollback plan
- [ ] Set up monitoring for migration

### 1.3 Team Preparation

- [ ] Inform team about migration
- [ ] Schedule maintenance window
- [ ] Prepare communication for users
- [ ] Document rollback procedures

---

## 2. Database Migration Steps

### Phase 1: Schema Creation (Development)

**Step 1.1: Create profiles table**

```sql
-- Run in Supabase SQL Editor (Development)
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

**Step 1.2: Create addresses table**

```sql
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
```

**Step 1.3: Create favorite_orders table**

```sql
CREATE TABLE IF NOT EXISTS favorite_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Step 1.4: Modify orders table**

```sql
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
```

### Phase 2: Indexes and Triggers (Development)

**Step 2.1: Create indexes**

```sql
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
```

**Step 2.2: Create/update triggers**

```sql
-- Ensure update_updated_at function exists
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all new tables
CREATE TRIGGER profiles_update_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER addresses_update_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

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

CREATE TRIGGER addresses_enforce_single_default
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_address();

-- Profile auto-creation trigger
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

### Phase 3: RLS Policies (Development)

**Step 3.1: Enable RLS on new tables**

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_orders ENABLE ROW LEVEL SECURITY;
```

**Step 3.2: Create RLS policies for profiles**

```sql
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
```

**Step 3.3: Create RLS policies for addresses**

```sql
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
```

**Step 3.4: Create RLS policies for favorite_orders**

```sql
CREATE POLICY "Users can read own favorite order"
  ON favorite_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = favorite_orders.user_id));

CREATE POLICY "Users can insert own favorite order"
  ON favorite_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = favorite_orders.user_id));

CREATE POLICY "Users can update own favorite order"
  ON favorite_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = favorite_orders.user_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = favorite_orders.user_id));

CREATE POLICY "Users can delete own favorite order"
  ON favorite_orders FOR DELETE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = favorite_orders.user_id));

CREATE POLICY "Service role can manage favorite orders"
  ON favorite_orders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**Step 3.5: Update RLS policies for orders**

```sql
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
```

### Phase 4: Verification (Development)

**Step 4.1: Test profile creation**

```sql
-- Create test user via Supabase Auth
-- Verify profile is auto-created
SELECT * FROM profiles WHERE user_id = 'test-user-id';
```

**Step 4.2: Test address operations**

```sql
-- Test creating address
INSERT INTO addresses (user_id, label, address, lat, lng)
VALUES ('test-profile-id', 'Home', 'Test Address', 38.4, 21.8);

-- Test default address enforcement
INSERT INTO addresses (user_id, label, address, lat, lng, is_default)
VALUES ('test-profile-id', 'Work', 'Work Address', 38.5, 21.9, true);

-- Verify only one default exists
SELECT * FROM addresses WHERE user_id = 'test-profile-id' AND is_default = true;
```

**Step 4.3: Test RLS policies**

```sql
-- Test as authenticated user
-- Should only see own data
SELECT * FROM profiles;
SELECT * FROM addresses;
SELECT * FROM favorite_orders;
```

**Step 4.4: Test guest orders still work**

```sql
-- Insert guest order (user_id = NULL)
INSERT INTO orders (items, subtotal, delivery_fee, total, customer_name, customer_phone, address, payment_method, payment_status, status)
VALUES ('[]'::jsonb, 0, 0, 0, 'Test', '123', 'Test', 'cod', 'pending', 'pending');

-- Verify order is created
SELECT * FROM orders WHERE customer_name = 'Test';
```

---

## 3. Code Migration Steps

### Phase 1: Authentication Layer

**Step 1.1: Create auth feature structure**

```
src/features/auth/
├── components/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── GoogleButton.tsx
│   └── AuthGuard.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useLogin.ts
│   ├── useRegister.ts
│   └── useGoogleAuth.ts
├── store/
│   └── auth-store.ts
├── types/
│   └── auth.types.ts
└── services/
    └── auth.service.ts
```

**Step 1.2: Implement auth-store.ts**

```typescript
// Zustand store for auth state
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
}
```

**Step 1.3: Implement auth services**

```typescript
// auth.service.ts
export async function signInWithEmail(email: string, password: string);
export async function signUpWithEmail(email: string, password: string, name: string);
export async function signInWithGoogle();
export async function signOut();
export async function getCurrentUser();
```

**Step 1.4: Create login page**

```
app/login/page.tsx
```

**Step 1.5: Create register page**

```
app/register/page.tsx
```

### Phase 2: Account Features

**Step 2.1: Create account feature structure**

```
src/features/account/
├── components/
│   ├── AccountDashboard.tsx
│   ├── ProfileSection.tsx
│   ├── AddressesSection.tsx
│   ├── OrdersSection.tsx
│   └── FavoriteSection.tsx
├── hooks/
│   ├── useProfile.ts
│   ├── useAddresses.ts
│   ├── useOrders.ts
│   └── useFavoriteOrder.ts
├── types/
│   └── account.types.ts
└── services/
    ├── profile.service.ts
    ├── address.service.ts
    └── order.service.ts
```

**Step 2.2: Implement account services**

```typescript
// profile.service.ts
export async function getProfile(userId: string);
export async function updateProfile(userId: string, data: ProfileUpdate);
export async function createProfile(userId: string, data: ProfileCreate);

// address.service.ts
export async function getAddresses(userId: string);
export async function createAddress(userId: string, data: AddressCreate);
export async function updateAddress(addressId: string, data: AddressUpdate);
export async function deleteAddress(addressId: string);
export async function setDefaultAddress(addressId: string);

// order.service.ts (extend existing)
export async function getUserOrders(userId: string);
export async function linkOrderToUser(orderId: string, userId: string);
```

**Step 2.3: Create account dashboard**

```
app/account/page.tsx
```

**Step 2.4: Create account sub-pages**

```
app/account/profile/page.tsx
app/account/addresses/page.tsx
app/account/orders/page.tsx
app/account/favorites/page.tsx
```

### Phase 3: Checkout Integration

**Step 3.1: Update checkout-store.ts**

```typescript
// Add user_id to checkout state
interface CheckoutFormData {
  // ... existing fields
  userId?: string | null; // New field
}
```

**Step 3.2: Update useCheckoutSubmit.ts**

```typescript
// Include user_id in order payload
const payload = {
  // ... existing fields
  user_id: userId || null, // New field
};
```

**Step 3.3: Add saved addresses to DeliveryStep**

```typescript
// Display saved addresses dropdown
// Allow selection of saved address
// Auto-fill form from selected address
```

**Step 3.4: Add profile auto-fill**

```typescript
// Auto-fill name/phone from profile if available
// Allow manual override
```

### Phase 4: Post-Order Registration Flow

**Step 4.1: Update order-success page**

```typescript
// Display registration prompt for guest users
// Show benefits of account creation
// Add "Continue with Google" button
// Add "Create Account" button
```

**Step 4.2: Implement order linking**

```typescript
// Match guest order to new user by email/phone
// Update orders.user_id
// Add to user's order history
```

### Phase 5: Reorder and Favorite Order

**Step 5.1: Add reorder button to order history**

```typescript
// "Order Again" button on each order
// Clears cart and rebuilds from order items
// Redirects to checkout
```

**Step 5.2: Add favorite order to homepage**

```typescript
// Display favorite order if exists
// "Order Now" button
// One-click load to cart
```

**Step 5.3: Add save favorite option**

```typescript
// "Save as Favorite" button in checkout
// Update favorite_orders table
```

---

## 4. Deployment Strategy

### 4.1 Development Environment

**Timeline:** Day 1-2

1. Run database migration in development
2. Implement authentication layer
3. Implement account features
4. Test all functionality
5. Fix bugs and issues

### 4.2 Staging Environment

**Timeline:** Day 3-4

1. Create staging database backup
2. Run database migration in staging
3. Deploy code to staging
4. Test all functionality
5. Perform integration testing
6. Load testing if needed

### 4.3 Production Environment

**Timeline:** Day 5 (during low-traffic period)

1. Create production database backup
2. Announce maintenance window
3. Run database migration in production
4. Deploy code to production
5. Monitor for errors
6. Verify guest checkout still works
7. Test authentication flow
8. Test account features

---

## 5. Rollback Plan

### 5.1 Database Rollback

**If migration fails:**

```sql
-- Drop new tables
DROP TABLE IF EXISTS favorite_orders CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Remove column from orders
ALTER TABLE orders DROP COLUMN IF EXISTS user_id;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS addresses_enforce_single_default ON addresses;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS enforce_single_default_address();

-- Drop indexes
DROP INDEX IF EXISTS idx_profiles_user_id;
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_addresses_user_id;
DROP INDEX IF EXISTS idx_addresses_is_default;
DROP INDEX IF EXISTS idx_favorite_orders_user_id;
DROP INDEX IF EXISTS idx_orders_user_id;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
-- (repeat for all policies)
```

**Restore from backup:**

1. Stop application
2. Restore database from pre-migration backup
3. Restart application
4. Verify guest checkout works

### 5.2 Code Rollback

**If deployment fails:**

1. Revert to previous commit
2. Redeploy previous version
3. Monitor for errors
4. Communicate with users

---

## 6. Testing Strategy

### 6.1 Database Testing

**Unit Tests:**

- Test profile CRUD operations
- Test address CRUD operations
- Test favorite order operations
- Test RLS policies
- Test triggers

**Integration Tests:**

- Test profile auto-creation
- Test address default enforcement
- Test order-user linking
- Test guest order compatibility

### 6.2 Code Testing

**Unit Tests:**

- Test auth hooks
- Test account hooks
- Test services
- Test stores

**Integration Tests:**

- Test login flow
- Test registration flow
- Test Google OAuth
- Test profile management
- Test address management
- Test order history
- Test reorder functionality
- Test favorite order

**E2E Tests:**

- Test complete user journey
- Test guest checkout
- Test authenticated checkout
- Test post-order registration

### 6.3 Mobile Testing

**Devices to test:**

- iPhone (375px, 390px, 414px)
- Android (360px, 390px, 412px)
- Tablet (768px, 1024px)
- Desktop (1920px)

**Test scenarios:**

- Login on mobile
- Register on mobile
- Manage profile on mobile
- Manage addresses on mobile
- View order history on mobile
- Reorder on mobile
- Save favorite on mobile

---

## 7. Monitoring and Validation

### 7.1 Post-Migration Checks

**Database:**

- [ ] Verify all tables created
- [ ] Verify all indexes created
- [ ] Verify all triggers working
- [ ] Verify RLS policies active
- [ ] Test profile auto-creation
- [ ] Test address operations
- [ ] Test guest orders

**Application:**

- [ ] Verify login works
- [ ] Verify registration works
- [ ] Verify Google OAuth works
- [ ] Verify profile management works
- [ ] Verify address management works
- [ ] Verify order history works
- [ ] Verify reorder works
- [ ] Verify favorite order works
- [ ] Verify guest checkout still works

### 7.2 Performance Monitoring

**Metrics to monitor:**

- Database query performance
- API response times
- Page load times
- Authentication latency
- Error rates

**Alert thresholds:**

- Database query > 500ms
- API response > 1s
- Page load > 3s
- Error rate > 1%

### 7.3 User Feedback

**Monitor:**

- User complaints
- Support tickets
- Error reports
- Usage analytics

**Quick response plan:**

- Address critical issues immediately
- Roll back if necessary
- Communicate with users

---

## 8. Communication Plan

### 8.1 Pre-Migration

**Internal team:**

- Email notification 1 week before
- Standup meeting to discuss
- Documentation review
- Rollback plan review

**Users:**

- No notification needed (backward compatible)

### 8.2 During Migration

**Internal team:**

- Status updates every 30 minutes
- Slack channel for coordination
- Emergency contact list

**Users:**

- Maintenance page if downtime > 5 minutes

### 8.3 Post-Migration

**Internal team:**

- Post-mortem meeting
- Lessons learned
- Documentation updates

**Users:**

- Optional: New feature announcement
- Highlight benefits of accounts

---

## 9. Timeline Summary

| Phase                        | Duration | Environment |
| ---------------------------- | -------- | ----------- |
| Database Migration (Dev)     | Day 1    | Development |
| Auth Implementation          | Day 1-2  | Development |
| Account Features             | Day 2-3  | Development |
| Checkout Integration         | Day 3    | Development |
| Testing (Dev)                | Day 3-4  | Development |
| Database Migration (Staging) | Day 4    | Staging     |
| Deployment (Staging)         | Day 4    | Staging     |
| Testing (Staging)            | Day 4-5  | Staging     |
| Database Migration (Prod)    | Day 5    | Production  |
| Deployment (Prod)            | Day 5    | Production  |
| Monitoring                   | Day 5+   | Production  |

**Total:** 5 days

---

## 10. Success Criteria

### 10.1 Technical Success

- [ ] All database migrations successful
- [ ] All RLS policies working correctly
- [ ] Guest checkout still functional
- [ ] Authentication flow working
- [ ] Account features working
- [ ] No data loss
- [ ] No performance degradation

### 10.2 Business Success

- [ ] Users can create accounts
- [ ] Users can manage profiles
- [ ] Users can save addresses
- [ ] Users can view order history
- [ ] Users can reorder
- [ ] Users can save favorite orders
- [ ] Guest checkout still available
- [ ] Mobile experience optimized

---

## 11. Conclusion

This migration plan provides a structured approach to implementing the customer account system while maintaining backward compatibility with guest orders. The phased approach ensures minimal risk and allows for thorough testing at each stage.

**Key Points:**

- Backward compatible with guest orders
- Phased deployment (dev → staging → prod)
- Comprehensive rollback plan
- Thorough testing strategy
- Clear communication plan

**Next Steps:**

1. Review and approve migration plan
2. Create Risks Report
3. Create Implementation Plan
4. Begin Phase 1 (Database Migration - Development)

---

_Generated: June 2026_
_Version: 1.0_
