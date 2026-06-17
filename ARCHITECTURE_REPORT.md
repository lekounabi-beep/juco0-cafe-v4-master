# Architecture Report - Customer Account System

## Executive Summary

This report analyzes the current architecture of the Juco Café ordering platform and provides a comprehensive plan for implementing a customer account system optimized for repeat orders and mobile-first experience.

---

## 1. Current Architecture Analysis

### 1.1 Technology Stack

**Frontend:**
- Next.js 15+ (App Router)
- TypeScript
- Tailwind CSS v4
- Zustand (State Management)
- React Hooks

**Backend/Database:**
- Supabase (PostgreSQL)
- Row Level Security (RLS)
- Real-time Subscriptions
- Built-in Authentication (unused)

**Integrations:**
- Google Maps API (Places, Geocoding)
- Viva Wallet (Payment Processing)

**Runtime:**
- Bun (Package Manager & Runtime)

### 1.2 Current Folder Structure

```
src/
├── features/
│   ├── cart/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/ (cart-store.ts)
│   │   └── types/
│   ├── checkout/
│   │   ├── components/
│   │   ├── hooks/
│   │   │   ├── useCheckoutFlow.ts
│   │   │   ├── useCheckoutForm.ts
│   │   │   ├── useCheckoutValidation.ts
│   │   │   └── useCheckoutSubmit.ts
│   │   ├── store/ (checkout-store.ts)
│   │   └── types/
│   └── maps/
│       ├── components/
│       ├── hooks/
│       │   └── useAddressAutocomplete.ts
│       ├── store/ (maps-store.ts)
│       └── types/
├── integrations/
│   ├── google-maps/
│   │   ├── services/
│   │   ├── loader.ts
│   │   └── config.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── client.server.ts
│   │   ├── types.ts
│   │   └── services/
│   │       └── order.service.ts
│   └── viva/
│       ├── services/
│       └── types.ts
├── shared/
│   ├── types/
│   └── utils/
└── components/
```

### 1.3 Current Data Flow

**Cart Flow:**
1. User adds items to cart → Zustand store (persisted)
2. Cart state persists across sessions
3. Subtotal/delivery fee calculated in real-time

**Checkout Flow:**
1. User proceeds to checkout → 3-step process
2. Step 1: Cart review
3. Step 2: Delivery info (name, phone, address, coords)
4. Step 3: Payment method selection
5. Submit → Order created in Supabase → Redirect to success

**Order Flow:**
1. Order submitted → `createOrder()` service
2. Card payment: Viva Wallet order code → Redirect → Success callback
3. Cash payment: Direct order creation → Success page
4. Order stored in `orders` table with customer info

**Payment Flow:**
1. Card: Viva Wallet Native Smart Checkout
2. Cash: Direct order creation
3. Success callback updates payment status

**Google Maps Flow:**
1. User types address → Autocomplete suggestions
2. User selects suggestion → Place details fetched
3. Coordinates stored in checkout store
4. Map centered on selected location

### 1.4 Current Database Schema

**orders table:**
```sql
- id (UUID, PK)
- order_number (TEXT, UNIQUE)
- items (JSONB)
- subtotal (NUMERIC)
- delivery_fee (NUMERIC)
- total (NUMERIC)
- customer_name (TEXT)
- customer_phone (TEXT)
- address (TEXT)
- address_notes (TEXT)
- lat (NUMERIC)
- lng (NUMERIC)
- notes (TEXT)
- payment_method (TEXT)
- payment_status (TEXT)
- viva_transaction_id (TEXT, UNIQUE)
- status (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**feedback table:**
```sql
- id (UUID, PK)
- name (TEXT)
- phone (TEXT)
- rating (INTEGER)
- message (TEXT)
- resolved (BOOLEAN)
- created_at (TIMESTAMPTZ)
```

### 1.5 Current State Management

**Zustand Stores:**
1. `useCart` - Cart items, add/remove/clear operations
2. `useCheckoutStore` - Checkout form data, step management
3. `useMapsStore` - Map center, selected address/coords

**Persistence:**
- Cart: LocalStorage (via Zustand persist middleware)
- Checkout: No persistence (session-only)
- Maps: No persistence (session-only)

### 1.6 Current Authentication

**Status:** NOT IMPLEMENTED

- Supabase Auth is available but not used
- All orders are guest orders
- No user accounts
- No session management
- No protected routes

### 1.7 Current UI System

**Design System:**
- Glassmorphism UI (glass, glass-strong classes)
- Custom color palette (Warm Coffee theme)
- Tailwind CSS v4 with @theme directive
- Mobile-first responsive design
- Custom animations and transitions

**Components:**
- Reusable form fields (CheckoutField)
- Stepper component (CheckoutStepper)
- Glass cards and containers
- Custom buttons with glow effects

---

## 2. Architecture Strengths

1. **Feature-based organization** - Clean separation of concerns
2. **Zustand state management** - Simple, performant, with persistence
3. **Service layer pattern** - Clean API integration
4. **Type safety** - Full TypeScript coverage
5. **Mobile-first design** - Responsive and touch-friendly
6. **Real-time capabilities** - Supabase subscriptions ready
7. **Modular architecture** - Easy to extend

---

## 3. Architecture Gaps for Account System

### 3.1 Authentication Layer
- **Missing:** Supabase Auth integration
- **Missing:** Session management
- **Missing:** Protected routes
- **Missing:** OAuth providers (Google, etc.)

### 3.2 User Data Layer
- **Missing:** User profiles table
- **Missing:** Addresses table
- **Missing:** Favorite orders table
- **Missing:** User-specific order queries

### 3.3 Account Features
- **Missing:** Profile management
- **Missing:** Address management (CRUD)
- **Missing:** Order history
- **Missing:** Reorder functionality
- **Missing:** Favorite order system

### 3.4 Post-Order Flow
- **Missing:** Registration prompt after guest checkout
- **Missing:** Link guest orders to user account
- **Missing:** Seamless account creation

### 3.5 Security
- **Missing:** RLS policies for user data
- **Missing:** User-specific data isolation
- **Missing:** Protected API routes

---

## 4. Proposed Architecture Changes

### 4.1 New Feature Modules

```
src/features/
├── auth/
│   ├── components/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── GoogleButton.tsx
│   │   └── AuthGuard.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useLogin.ts
│   │   ├── useRegister.ts
│   │   └── useGoogleAuth.ts
│   ├── store/
│   │   └── auth-store.ts
│   ├── types/
│   │   └── auth.types.ts
│   └── services/
│       └── auth.service.ts
├── account/
│   ├── components/
│   │   ├── AccountDashboard.tsx
│   │   ├── ProfileSection.tsx
│   │   ├── AddressesSection.tsx
│   │   ├── OrdersSection.tsx
│   │   └── FavoriteSection.tsx
│   ├── hooks/
│   │   ├── useProfile.ts
│   │   ├── useAddresses.ts
│   │   ├── useOrders.ts
│   │   └── useFavoriteOrder.ts
│   ├── types/
│   │   └── account.types.ts
│   └── services/
│       ├── profile.service.ts
│       ├── address.service.ts
│       └── order.service.ts
```

### 4.2 New Database Tables

**profiles table:**
```sql
- id (UUID, PK, REFERENCES auth.users)
- user_id (UUID, UNIQUE, REFERENCES auth.users)
- full_name (TEXT)
- phone (TEXT)
- email (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**addresses table:**
```sql
- id (UUID, PK)
- user_id (UUID, REFERENCES profiles)
- label (TEXT) -- Home, Work, Other
- address (TEXT)
- lat (NUMERIC)
- lng (NUMERIC)
- notes (TEXT)
- is_default (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**favorite_orders table:**
```sql
- id (UUID, PK)
- user_id (UUID, REFERENCES profiles)
- items (JSONB)
- updated_at (TIMESTAMPTZ)
```

**orders table modification:**
```sql
- Add user_id (UUID, REFERENCES profiles, NULLABLE)
- Add index on user_id
```

### 4.3 New State Management

**auth-store.ts:**
- User session state
- Loading states
- Error states
- Auth methods

**account-store.ts:**
- Profile data
- Addresses list
- Favorite order
- Order history cache

### 4.4 New Routes

```
/login
/register
/account
/account/profile
/account/addresses
/account/orders
/account/favorites
```

### 4.5 Integration Points

**Checkout Flow Integration:**
- Pre-fill from saved addresses
- Pre-fill from profile
- Link order to user if authenticated
- Prompt for registration after guest checkout

**Cart Flow Integration:**
- Reorder from history
- Load favorite order
- Persist cart per user

**Maps Flow Integration:**
- Reuse existing autocomplete
- Save coordinates with addresses
- Select from saved addresses

---

## 5. Data Flow Changes

### 5.1 Authentication Flow

**Login Flow:**
1. User enters email/password → `signInWithEmail()`
2. Supabase Auth validates → Session created
3. Profile fetched or created → auth-store updated
4. Redirect to account or checkout

**Google OAuth Flow:**
1. User clicks "Continue with Google"
2. Supabase OAuth redirect → Google consent
3. User authorized → Supabase creates user
4. Profile auto-created → Session established
5. Redirect to account or checkout

**Registration Flow:**
1. User enters email/password/name → `signUp()`
2. Supabase creates user → Profile created via trigger
3. Email verification (optional) → Session created
4. Redirect to account

### 5.2 Account Data Flow

**Profile Management:**
1. User updates profile → `updateProfile()` service
2. Supabase updates profiles table → auth-store updated
3. Checkout form auto-fills from profile

**Address Management:**
1. User adds address → `createAddress()` service
2. Address saved with coordinates → addresses table
3. Available in checkout dropdown
4. Default address auto-selected

**Order History:**
1. User views orders → `getUserOrders()` service
2. Query filtered by user_id → RLS enforced
3. Orders displayed in account
4. Reorder button available

**Favorite Order:**
1. User saves favorite → `saveFavoriteOrder()` service
2. Cart items saved → favorite_orders table
3. Homepage displays favorite
4. One-click load to cart

### 5.3 Post-Order Flow

**Guest to User Conversion:**
1. Guest completes order → Success page
2. Display registration prompt
3. User creates account → Link order to user
4. Order history includes previous guest order

---

## 6. Security Considerations

### 6.1 Row Level Security (RLS)

**profiles table:**
- Users can only read/update their own profile
- `auth.uid() = user_id`

**addresses table:**
- Users can only read/write their own addresses
- `auth.uid() = user_id`

**favorite_orders table:**
- Users can only read/write their own favorites
- `auth.uid() = user_id`

**orders table:**
- Users can only read their own orders
- `auth.uid() = user_id` OR `user_id IS NULL` (for guest orders)

### 6.2 Session Management

- Supabase Auth handles sessions
- Automatic token refresh
- Session persistence via localStorage
- Protected route middleware

### 6.3 OAuth Security

- Supabase handles OAuth flow
- PKCE for code exchange
- Secure redirect URLs
- Error handling for failed auth

---

## 7. Performance Considerations

### 7.1 Bundle Size

- Lazy load auth components
- Dynamic import account pages
- Code splitting by route
- Tree shaking for unused features

### 7.2 Database Performance

- Indexes on user_id columns
- Efficient RLS policies
- Query optimization for order history
- Pagination for large datasets

### 7.3 State Management

- Avoid unnecessary re-renders
- Use selectors for Zustand stores
- Cache frequently accessed data
- Debounce API calls

---

## 8. Mobile-First Considerations

### 8.1 Responsive Design

- 320px minimum width support
- Touch-friendly tap targets (44px minimum)
- Bottom navigation for easy reach
- Safe area support for iPhone
- One-handed usage optimization

### 8.2 Form UX

- Large input fields
- Clear error messages
- Auto-focus next field
- Keyboard type optimization
- Input masking for phone numbers

### 8.3 Performance

- Fast page loads
- Smooth animations
- No horizontal scrolling
- Optimized images
- Efficient state updates

---

## 9. Migration Strategy

### 9.1 Database Migration

1. Create new tables (profiles, addresses, favorite_orders)
2. Add user_id column to orders (nullable)
3. Create RLS policies
4. Create triggers for profile auto-creation
5. Backfill existing orders (optional)

### 9.2 Code Migration

1. Implement auth layer first
2. Add account features incrementally
3. Integrate with existing checkout
4. Add post-order registration flow
5. Test guest checkout still works

### 9.3 Rollout Strategy

1. Feature flag authentication
2. Beta test with small user group
3. Monitor performance and errors
4. Gradual rollout to all users
5. Keep guest checkout as fallback

---

## 10. Conclusion

The current architecture is well-structured and ready for account system integration. The feature-based organization, Zustand state management, and service layer pattern provide a solid foundation for adding authentication and account features.

The proposed changes maintain architectural consistency while adding the necessary layers for user accounts, profiles, addresses, and order history. The mobile-first design principles already in place will extend naturally to the new account features.

**Next Steps:**
1. Create Database Plan
2. Create Migration Plan
3. Create Risks Report
4. Create Implementation Plan
5. Begin implementation following the plan

---

*Generated: June 2026*
*Version: 1.0*
