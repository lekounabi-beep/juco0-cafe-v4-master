# Phase 1.5 — Security Closure Report

Date: 2026-06-27  
Scope: Close all production blockers from the final verification audit.

---

## Summary

All audit blockers have been addressed in code. **Apply migration `20260631000000_phase1_5_security_closure.sql` to Supabase before deploy.** Configure `VIVA_WEBHOOK_KEY` and register webhook URL in Viva dashboard.

---

## Blocker Resolution

### 1. Anonymous order creation (CRITICAL)

**Found:** RLS policy `"Public can create pending orders"` + `GRANT INSERT ON orders TO anon` allowed direct Supabase REST inserts with client-controlled prices, bypassing server pricing.

**Changed:**

- New migration drops public insert policy, revokes `INSERT` from `anon`/`authenticated`
- Removed `createOrder()` from `order.service.ts` (client path eliminated)
- Orders created only via `supabaseAdmin` in server actions

**Files:** `supabase/migrations/20260631000000_phase1_5_security_closure.sql`, `src/integrations/supabase/services/order.service.ts`

**Policies removed:** `"Public can create pending orders"`, `"Anyone can create orders"` (idempotent DROP)

**Grants changed:** `REVOKE INSERT ON public.orders FROM anon, authenticated`

---

### 2. Database schema verification (CRITICAL deploy gate)

**Found:** Phase 1 migration required; legacy policies could conflict.

**Changed:** Phase 1.5 migration consolidates closure items (see migration file). Prior migration `20260630000000_phase1_security_integrity.sql` still required for `client_request_id`, tracking RPC shape, GPS revoke.

**Apply order:**

1. `20260630000000_phase1_security_integrity.sql`
2. `20260631000000_phase1_5_security_closure.sql`

---

### 3. Viva webhook / IPN (CRITICAL)

**Found:** Card orders only created when browser reached `/order-success`.

**Changed:**

- `app/api/viva/webhook/route.ts` — GET verification key, POST `Transaction Payment Created` (1796)
- `checkout_pending` table stores signed checkout token keyed by `viva_order_code`
- `initiateCardCheckoutServer` persists pending checkout for webhook lookup
- Shared completion logic in `src/lib/server/complete-viva-order.server.ts`
- `/order-success` unchanged for UX; idempotent with webhook

**Env:** `VIVA_WEBHOOK_KEY` (required in production)

**Webhook URL:** `https://<your-domain>/api/viva/webhook`

---

### 4. Fail-closed Viva orderCode verification (HIGH)

**Found:** `assertVivaPaymentMatchesOrder` skipped orderCode check when Viva returned null.

**Changed:** If `expectedOrderCode` is set, `actual orderCode` must exist and match exactly; otherwise reject.

**File:** `src/integrations/viva/services/payment.server.ts`

---

### 5. COD server action restriction (HIGH)

**Found:** `submitCodOrderServer` accepted any `payment_method`.

**Changed:** Rejects unless `payment_method === "cod"`; logs security event; order payload always uses `"cod"`.

**File:** `app/actions/checkout-order.ts`

---

### 6. Production seed passwords (HIGH)

**Found:** Migration `20260624000000` seeded plaintext passwords `'1'` / `'9'`.

**Changed:**

- Phase 1.5 migration clears plaintext passwords and drops `drivers.password` column
- Dev-only seed: `supabase/seeds/dev_drivers.sql`, `scripts/seed-dev-drivers.mjs`

**Do not run dev seed in production.**

---

### 7. Driver login protection

**Found:** Username enumeration, no rate limiting, no `is_active` re-check on session.

**Changed:**

- Removed `listDriverLoginUsernames()` usage (function deleted from exports)
- DB-backed rate limiting (`auth_lockouts` table) — 5 attempts / 15 min lockout
- `requireDriverSession()` checks `is_active` on every request
- Deactivated drivers fail immediately

**Files:** `app/actions/driver-login.ts`, `src/lib/server/rate-limit.server.ts`, `src/features/driver/components/DriverLoginForm.tsx`

---

### 8. Session revocation

**Found:** Logout only cleared cookie; stolen tokens valid until expiry.

**Changed:**

- `revoked_sessions` table stores session `sid` on logout
- `requireAdminSession()` / `requireDriverSession()` reject revoked `sid`

**Files:** `src/lib/server/session-revocation.server.ts`, `app/actions/admin-auth.ts`, `app/actions/driver-login.ts`

---

### 9. Tracking RPC protection

**Found:** Anon could call assignment/GPS RPCs with only order UUID.

**Changed:**

- REVOKE anon/authenticated EXECUTE on tracking/GPS RPCs
- REVOKE anon SELECT on `delivery_locations`
- Server actions gate access via `order_access` cookie:
  - `getAssignmentForTrackingServer`
  - `getLocationHistoryForTrackingServer`
  - `getDriverForTrackingServer`
- Driver GPS via `getLocationHistoryForDriverServer` (driver session)
- Client polling replaces anon realtime for GPS (3s interval)

**Files:** `app/actions/tracking-delivery.ts`, migration, `use-canonical-delivery-locations.ts`, `useLiveDriverLocation.ts`, `app/track/[orderId]/page.tsx`

**RPCs — grants changed:**

- `get_order_for_tracking` → service_role only
- `get_delivery_assignment_for_order` → service_role only
- `get_latest_delivery_location` → service_role only
- `get_delivery_location_history` → service_role only

**Policies removed:** `"Tracking can read delivery locations"` on `delivery_locations`

---

### 10. Plaintext driver passwords

**Found:** `drivers.password` column retained plaintext until lazy migration.

**Changed:** Column dropped in Phase 1.5 migration; login uses `password_hash` only (bcrypt).

---

### 11. Error sanitization

**Found:** Postgres error messages returned to browser from admin/driver actions.

**Changed:** Generic client messages; detailed errors in `serverLog` only.

**Files:** `admin-orders.ts`, `create-delivery-assignment.ts`, `driver-workflow.ts`, `driver-availability.ts`, `driver-gps.ts`, `driver-orders.ts`, `create-driver.ts`, `src/lib/server/client-error.server.ts`

---

## New Migration

| File                                                               | Purpose                                                                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20260631000000_phase1_5_security_closure.sql` | Order INSERT lockdown, tracking/GPS revoke, session/checkout/lockout tables, drop plaintext passwords |

## New Tables

- `revoked_sessions`
- `checkout_pending`
- `auth_lockouts`

## New Env Vars

| Variable           | Required (prod) | Purpose                           |
| ------------------ | --------------- | --------------------------------- |
| `VIVA_WEBHOOK_KEY` | Yes             | Webhook verification GET response |

## New API Routes

| Route               | Method | Purpose                            |
| ------------------- | ------ | ---------------------------------- |
| `/api/viva/webhook` | GET    | Viva webhook verification          |
| `/api/viva/webhook` | POST   | Payment completion (authoritative) |

---

## Verification Checklist

| Check                            | Status                                |
| -------------------------------- | ------------------------------------- |
| No anonymous order INSERT        | ✅ REVOKE + policy DROP               |
| No checkout pricing bypass       | ✅ Server-only inserts                |
| No payment bypass (COD as card)  | ✅ COD-only server action             |
| No fail-open orderCode           | ✅ Fail-closed verification           |
| No payment loss on redirect miss | ✅ Webhook path                       |
| No GPS anon read                 | ✅ REVOKE SELECT + server actions     |
| No tracking RPC anon access      | ✅ REVOKE EXECUTE + order_access gate |
| No plaintext passwords           | ✅ Column dropped                     |
| No default prod credentials      | ✅ Dev seed only                      |
| Session revocation on logout     | ✅ revoked_sessions                   |
| Driver brute-force mitigation    | ✅ Rate limiting                      |

---

## Validation

```
bun run typecheck  ✅ PASS
bun run lint       ✅ PASS
bun run build      ✅ PASS
```

### Manual tests (recommended)

1. **Anon insert blocked:** Supabase REST `POST /orders` with anon key → 403/RLS error
2. **COD checkout:** Normal checkout with cash → order created with DB prices
3. **COD reject:** Call `submitCodOrderServer` with `payment_method: "card"` → rejected
4. **Card webhook:** Simulate Viva POST to `/api/viva/webhook` with OrderCode + TransactionId → order created without browser
5. **Order-success idempotent:** Complete same transaction twice → single order
6. **Tracking without cookie:** UUID-only access → status visible, no address/GPS/assignment
7. **Tracking with cookie:** After checkout → full PII + live GPS polling works
8. **Driver login rate limit:** 6 failed attempts → lockout message
9. **Driver deactivation:** Set `is_active=false` → next API call returns Unauthorized
10. **Logout revocation:** Logout → old cookie rejected on next privileged action
11. **Dev drivers:** `node scripts/seed-dev-drivers.mjs` → login with dev passwords

---

## Deploy Steps

1. Apply migrations (phase1 + phase1.5) to Supabase
2. Set `VIVA_WEBHOOK_KEY` in production env
3. Register webhook in Viva: `Transaction Payment Created` → `/api/viva/webhook`
4. Verify webhook (GET returns `{ Key: "..." }`)
5. For local dev drivers: `node scripts/seed-dev-drivers.mjs`
