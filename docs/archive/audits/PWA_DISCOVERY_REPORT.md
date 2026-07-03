# PWA Discovery Report — Juco Cafe v4

**Audit date:** 2026-06-26  
**Scope:** Read-only architecture discovery before site-wide PWA implementation  
**Stack:** Next.js 15.5 App Router · React 19 · Supabase · Bun

---

## Executive Summary

This codebase has a **driver-focused partial PWA**, not a site-wide PWA. A service worker, web manifest, install banner, and offline queue exist primarily for the `/driver/*` experience. Customer routes (`/`, `/checkout`, `/track/*`) have **no SW caching**, **no offline shell**, and **no install UX tailored to customers**.

Several PWA modules are **implemented but not wired** (`usePWAUpdate`, `PwaDevCleanup`, `pwa-update-guard.setPwaDeliveryActive`). The manifest is driver-branded but linked globally from the root layout, which creates install/metadata mismatch on customer pages.

**Confidence:** High — all findings verified against source files, import chains, and `public/` asset inventory.

---

## 1. Existing PWA Implementation

### 1.1 Web App Manifest

| Attribute       | Value                                                    |
| --------------- | -------------------------------------------------------- |
| **File**        | `public/manifest.json`                                   |
| **Linked from** | `app/layout.tsx` → `metadata.manifest: "/manifest.json"` |
| **Confidence**  | **High**                                                 |

**Current contents (driver-only branding):**

- `name`: "Juco Cafe Driver"
- `short_name`: "Juco Driver"
- `id`: `/driver`
- `start_url`: `/driver/login`
- `scope`: `/` (entire origin)
- `display`: `standalone`
- `theme_color`: `#E8F529`
- Icons: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`
- One shortcut: "Go Online" → `/driver/login`

**Importer chain:**

```
app/layout.tsx (metadata.manifest)
  └── Browser fetches /manifest.json on all routes
```

**Usage:** Site-wide manifest link, but content targets driver app. Customer install would launch driver login.

---

### 1.2 Service Worker

| Attribute        | Value                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| **Runtime file** | `public/sw.js`                                                                                   |
| **Generator**    | `scripts/generate-sw.mjs` (runs in `prebuild`)                                                   |
| **Registration** | `src/hooks/usePwaInstall.ts` → `src/components/ServiceWorkerRegistration.tsx` → `app/layout.tsx` |
| **Confidence**   | **High**                                                                                         |

**Importer chain:**

```
app/layout.tsx
  └── <ServiceWorkerRegistration />
        └── usePwaInstall()
              └── navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
```

**SW behavior (`public/sw.js`):**

| Feature                            | Present?            | Details                                                                                |
| ---------------------------------- | ------------------- | -------------------------------------------------------------------------------------- |
| `install` + `skipWaiting`          | ✅                  | Immediate activation                                                                   |
| `activate` + `clients.claim`       | ✅                  | Takes control immediately                                                              |
| Fetch interception                 | ✅                  | **Driver navigation only** (`/driver`, `/driver/*`)                                    |
| `/_next/*` bypass                  | ✅                  | Explicitly not cached (avoids stale chunks)                                            |
| Strategy                           | Network-first shell | Caches up to 3 HTML navigations in `juco-driver-shell-v1`                              |
| Offline fallback                   | ✅                  | Falls back to `/offline.html` or 503 plain text                                        |
| `message` / `SKIP_WAITING` handler | ❌                  | **Missing** — `pwa-update-guard.ts` posts `{ type: 'SKIP_WAITING' }` but SW ignores it |
| Asset precaching                   | ❌                  | No install-time precache                                                               |
| API caching                        | ❌                  | Not intercepted                                                                        |
| Push / Background Sync             | ❌                  | Not present                                                                            |

**Middleware:** `middleware.ts` matcher includes `/sw.js` and sets `Cache-Control: no-store, no-cache, must-revalidate`.

---

### 1.3 Service Worker Registration (Dual Paths)

| Component       | File                               | Mounted?                     | Purpose                                                                       |
| --------------- | ---------------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| `usePwaInstall` | `src/hooks/usePwaInstall.ts`       | ✅ Root layout               | Minimal SW registration for install eligibility                               |
| `usePWAUpdate`  | `src/hooks/usePWAUpdate.ts`        | ❌ **Not imported anywhere** | Update toast, hourly `registration.update()`, deferred reload during delivery |
| `PwaDevCleanup` | `src/components/PwaDevCleanup.tsx` | ❌ **Not imported anywhere** | Dev/tunnel: unregister SW + clear caches before React                         |

**Confidence:** High — grep confirms zero imports of `usePWAUpdate` and `PwaDevCleanup` outside docs/comments.

---

### 1.4 Web App Manifest Metadata (HTML)

| Source               | File                          | Details                                                                       |
| -------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| Next.js Metadata API | `app/layout.tsx`              | `title`, `description`, `manifest`, `icons`, `appleWebApp`                    |
| Viewport             | `app/layout.tsx`              | `themeColor: #E8F529`, `maximumScale: 1`, `userScalable: false`               |
| Apple touch          | `metadata.icons.apple`        | `/icon-192.png`                                                               |
| Legacy purge script  | `src/lib/pwa-legacy-purge.ts` | Inline `<script>` in `<head>` — one-time unregister of legacy `juco-*` caches |

**Confidence:** High

---

### 1.5 PWA Install Banner

| Attribute      | Value                                 |
| -------------- | ------------------------------------- |
| **File**       | `src/components/PwaInstallBanner.tsx` |
| **Mounted**    | `app/layout.tsx` (all routes)         |
| **Confidence** | **High**                              |

**Behavior:**

- Detects `beforeinstallprompt` (Chrome/Android) — stores deferred event, shows "Εγκατάσταση" button
- iOS: shows Share → "Add to Home Screen" instructions
- Dismiss state: `sessionStorage.pwa_install_dismissed`
- Standalone detection: `matchMedia('(display-mode: standalone)')` + `navigator.standalone` (iOS)
- **Copy is driver-branded:** "Εγκατάσταση Juco Driver" on customer pages too

---

### 1.6 Update Hooks

| File                          | Status      | Notes                                                                   |
| ----------------------------- | ----------- | ----------------------------------------------------------------------- |
| `src/hooks/usePWAUpdate.ts`   | Dead code   | Skips registration in `development`; never mounted in production layout |
| `src/lib/pwa-update-guard.ts` | Dead code   | `setPwaDeliveryActive()` never called from driver hooks                 |
| SW `SKIP_WAITING`             | Broken path | Guard posts message; SW has no `message` listener                       |

**Intended flow (unwired):** User taps "Ενημέρωση" → `applyPwaUpdate()` → `skipWaiting` → `controllerchange` → reload (blocked during active delivery).

**Confidence:** High

---

### 1.7 Offline Page

| Attribute                 | Value                                                                          |
| ------------------------- | ------------------------------------------------------------------------------ |
| **File**                  | `public/offline.html`                                                          |
| **Referenced by**         | `public/sw.js` → `caches.match("/offline.html")` on driver nav network failure |
| **Pre-cached at install** | ❌ No — only served if previously fetched or cached incidentally               |
| **Confidence**            | **High**                                                                       |

Static Greek/English offline card branded for driver mode.

---

### 1.8 Push Notifications

| Capability                               | Status             |
| ---------------------------------------- | ------------------ |
| Web Push API (`PushManager`)             | ❌ Not implemented |
| `Notification.requestPermission`         | ❌ Not used        |
| VAPID / push subscription storage        | ❌ None            |
| SW `push` / `notificationclick` handlers | ❌ None            |

**What exists instead:** In-app **notification sounds** driven by Supabase Realtime (`notification-sound.service.ts`). Not system notifications.

**Confidence:** High

---

### 1.9 Background Sync

| Capability                     | Status      |
| ------------------------------ | ----------- |
| `registration.sync.register()` | ❌ Not used |
| SW `sync` event handler        | ❌ None     |

**What exists instead:** Custom **localStorage offline queue** (`offline-queue.service.ts`) synced on `navigator.onLine` + custom `juco:network-online` event.

**Confidence:** High

---

### 1.10 Notification Permission Flows

| Flow                               | Implementation                                             |
| ---------------------------------- | ---------------------------------------------------------- |
| Web Notification permission        | ❌ None                                                    |
| Geolocation permission             | ✅ `gps.service.ts`, `LocationPermissionModal`, `useGPS`   |
| Audio unlock (notification sounds) | ✅ `notification-sound.service.ts` — requires user gesture |

**Confidence:** High

---

### 1.11 Standalone Mode Detection

| Location                              | Method                                                          |
| ------------------------------------- | --------------------------------------------------------------- |
| `src/components/PwaInstallBanner.tsx` | `display-mode: standalone` media query + `navigator.standalone` |

No other route-level standalone branching found. Driver/customer UI does not adapt layout for installed PWA.

**Confidence:** High

---

### 1.12 PWA Implementation Summary Table

| Artifact               | Path                        | Mounted / Active     | Confidence |
| ---------------------- | --------------------------- | -------------------- | ---------- |
| Manifest               | `public/manifest.json`      | ✅ Global            | High       |
| Service Worker         | `public/sw.js`              | ✅ Prod registration | High       |
| SW generator           | `scripts/generate-sw.mjs`   | ✅ `prebuild`        | High       |
| SW registration        | `ServiceWorkerRegistration` | ✅                   | High       |
| Install banner         | `PwaInstallBanner`          | ✅                   | High       |
| Update UX              | `usePWAUpdate`              | ❌ Dead              | High       |
| Dev SW cleanup         | `PwaDevCleanup`             | ❌ Dead              | High       |
| Delivery-aware updates | `pwa-update-guard`          | ❌ Unwired           | High       |
| Offline HTML           | `public/offline.html`       | ⚠️ SW fallback only  | High       |
| Legacy cache purge     | `pwa-legacy-purge.ts`       | ✅ Inline script     | High       |

---

## 2. App Router Analysis

### 2.1 Route Inventory

| Route                | Purpose                                  | User Type | Auth                                     | Cache Strategy Recommendation                                                                                              |
| -------------------- | ---------------------------------------- | --------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `/`                  | Menu browse, cart FAB, store info        | Customer  | Public                                   | **Stale While Revalidate** — shell + menu images; products from Supabase need network-first with static `menu.ts` fallback |
| `/checkout`          | Multi-step order checkout                | Customer  | Public (optional auth enriches profile)  | **Network First** — form state in memory; cart persisted in localStorage                                                   |
| `/order-success`     | Post-payment confirmation, Viva callback | Customer  | Public                                   | **Network First** — requires `completeVivaOrder` server action                                                             |
| `/track/[orderId]`   | Live delivery tracking + map             | Customer  | Public (order ID as capability URL)      | **Network First** — Supabase realtime + Mapbox tiles; no offline value                                                     |
| `/login`             | Customer email/password login            | Customer  | Public                                   | **Network First**                                                                                                          |
| `/register`          | Customer registration                    | Customer  | Public                                   | **Network First**                                                                                                          |
| `/auth/callback`     | Supabase OAuth callback                  | Customer  | Public                                   | **Network First**                                                                                                          |
| `/account`           | Account dashboard                        | Customer  | **Auth protected** (middleware + client) | **Network First**                                                                                                          |
| `/account/orders`    | Order history                            | Customer  | Auth protected                           | **Network First**                                                                                                          |
| `/account/addresses` | Saved addresses CRUD                     | Customer  | Auth protected                           | **Network First**                                                                                                          |
| `/account/favorites` | Favorite order                           | Customer  | Auth protected                           | **Network First**                                                                                                          |
| `/account/profile`   | Profile + notification sound settings    | Customer  | Auth protected                           | **Network First**                                                                                                          |
| `/driver`            | Redirect to login or app                 | Driver    | Cookie gate (middleware)                 | **Network First** (redirect)                                                                                               |
| `/driver/login`      | Driver username login                    | Driver    | Public                                   | **Network First** with **offline shell** (current SW)                                                                      |
| `/driver` (app)      | Driver dashboard, GPS, deliveries        | Driver    | **DriverGuard** (localStorage session)   | **Network First shell + offline queue** (current partial impl)                                                             |
| `/admin/login`       | Admin password login                     | Admin     | Public                                   | **Network First**                                                                                                          |
| `/admin`             | Kitchen order board + realtime           | Admin     | **AdminGuard** (HTTP-only cookie)        | **Network First**                                                                                                          |
| `/admin/menu`        | Product/menu management                  | Admin     | Admin protected                          | **Network First**                                                                                                          |

### 2.2 Auth Protection Layers

| Layer                      | File                                                        | Protects                                                           |
| -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| Middleware (Supabase)      | `middleware.ts` → `src/integrations/supabase/middleware.ts` | `/account/*` → redirect to `/login`                                |
| Middleware (driver cookie) | `middleware.ts`                                             | `/driver` → redirect to `/driver/login` if no `driver_auth` cookie |
| Client guard               | `DriverGuard`                                               | `/driver/(app)/*` — localStorage `driver_session`                  |
| Client guard               | `AdminGuard`                                                | `/admin/*` except login — `verifyAdminCookie` server action        |

### 2.3 Layout Hierarchy

```
app/layout.tsx          ← PWA globals (manifest, SW, install banner)
├── / (pages)
├── /account/*
├── /checkout, /track/*, etc.
├── app/admin/layout.tsx  ← AdminGuard
│   └── /admin/*
└── app/driver/(app)/layout.tsx  ← DriverGuard
    └── /driver (dashboard)
```

**Note:** No route-group-specific manifest or SW scope. Single global PWA config.

---

## 3. API Analysis

### 3.1 HTTP Route Handlers (`app/api/*`)

| Endpoint    | Method | Type                                         | Cache Recommendation | Reason                                   |
| ----------- | ------ | -------------------------------------------- | -------------------- | ---------------------------------------- |
| `/api/viva` | POST   | Payment (Viva Wallet OAuth + order creation) | **No Store**         | Financial mutation; must never be cached |

### 3.2 Server Actions (`app/actions/*`)

| Action                                     | Type                     | Cache Recommendation | Reason                                 |
| ------------------------------------------ | ------------------------ | -------------------- | -------------------------------------- |
| `authenticateDriver`                       | Auth mutation            | **No Store**         | Session creation                       |
| `getDriverProfileById`                     | Read                     | **Network First**    | Profile data                           |
| `listDriverLoginUsernames`                 | Read                     | **Network First**    | Login helper                           |
| `fetchAcceptableOrdersForDriver`           | Read (realtime-adjacent) | **Network First**    | Live order pool                        |
| `fetchDriverActiveDelivery`                | Read                     | **Network First**    | Active delivery state                  |
| `driverAcceptOrder`                        | Mutation                 | **No Store**         | Assignment creation                    |
| `driverTransitionAtomic`                   | Mutation                 | **No Store**         | Delivery milestones                    |
| `updateDriverAvailabilityServer`           | Mutation                 | **No Store**         | Driver status                          |
| `adminLogin` / `adminLogout`               | Auth mutation            | **No Store**         | Admin session                          |
| `verifyAdminCookie` / `requireAdminCookie` | Auth read                | **No Store**         | Security check                         |
| `getAllOrdersForAdmin`                     | Read                     | **Network First**    | Kitchen board (also polled every 30s)  |
| `adminTransitionOrderStatus`               | Mutation                 | **No Store**         | Kitchen workflow                       |
| `createDriver`                             | Mutation                 | **No Store**         | Admin creates driver                   |
| `completeVivaOrder`                        | Mutation (payment)       | **No Store**         | Order finalization after Viva redirect |
| `revalidateMenu`                           | Cache invalidation       | **No Store**         | Next.js revalidation                   |

### 3.3 Supabase Client Services (`src/integrations/supabase/services/*`)

| Service / Function                                | Type                     | Cache Recommendation                                                      |
| ------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------- |
| `getProducts`, `getProductById`                   | Static-ish read          | **Stale While Revalidate** (client); menu has `src/data/menu.ts` fallback |
| `getStoreSettings`                                | Semi-static read         | **Stale While Revalidate**                                                |
| `createOrder`, `getOrderById`, `getUserOrders`    | Mutation / read          | **Network First** / **No Store**                                          |
| `signIn*`, `signUp*`, `signOut`, `getCurrentUser` | Auth                     | **No Store**                                                              |
| `getProfile`, `updateProfile`, `createProfile`    | Profile CRUD             | **Network First**                                                         |
| `getAddresses`, `createAddress`, etc.             | Address CRUD             | **Network First**                                                         |
| `getFavoriteOrder`, `saveFavoriteOrder`           | Favorites                | **Network First**                                                         |
| `realtimeService.*`                               | **Realtime** (WebSocket) | **No Cache** — live postgres_changes                                      |

**Realtime tables:** `orders`, `delivery_assignments`, `drivers`

### 3.4 Integration Services (`src/integrations/*`, `src/features/*/services/*`)

| Integration                                      | Type            | Cache Recommendation                                                               |
| ------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------- |
| Viva Wallet (`payment.service.ts` → `/api/viva`) | Payment         | **No Store**                                                                       |
| Mapbox Geocoding (`mapbox-search.ts`)            | GPS / geocoding | **Network First** (short TTL cache in `order-destination.service.ts` localStorage) |
| Google Maps JS API (`google-maps/loader.ts`)     | Map tiles / JS  | **Network First** (CDN)                                                            |
| Mapbox GL (`mapbox-gl`)                          | Map tiles       | **Network First**                                                                  |
| `record-driver-location` / `gps-repository`      | GPS mutation    | **No Store** (queued offline in localStorage)                                      |
| `offline-queue.service`                          | Offline sync    | N/A — application layer, not HTTP cache                                            |

### 3.5 API Category Summary

| Category                 | Endpoints / Services                                                     | Recommended Strategy                    |
| ------------------------ | ------------------------------------------------------------------------ | --------------------------------------- |
| **Realtime**             | Supabase `realtimeService`, hooks `useRealtimeOrders/Deliveries/Drivers` | No Cache                                |
| **Mutation**             | Server actions, `createOrder`, driver transitions, admin workflow        | No Store                                |
| **Static / semi-static** | `getProducts`, `getStoreSettings`, `public/images/*`                     | Stale While Revalidate or Cache First   |
| **Payment**              | `/api/viva`, `completeVivaOrder`, Viva redirect                          | No Store                                |
| **GPS**                  | `gps.service`, `record-driver-location`, Mapbox geocoding                | Network First; offline queue for writes |

---

## 4. Asset Analysis

### 4.1 Public Directory Inventory

| Category            | Location                                                                    | Count | Size    | Cache Suitability                                   |
| ------------------- | --------------------------------------------------------------------------- | ----- | ------- | --------------------------------------------------- |
| PWA icons           | `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png` (+ SVG variants) | 6     | ~23 KB  | **Cache First** (versioned filenames recommended)   |
| Favicon             | `/favicon.ico`                                                              | 1     | 320 B   | Cache First                                         |
| Manifest            | `/manifest.json`                                                            | 1     | 939 B   | Network First (short TTL) or version query param    |
| Service Worker      | `/sw.js`                                                                    | 1     | 1.7 KB  | **No Store** (already enforced in middleware)       |
| Offline page        | `/offline.html`                                                             | 1     | 1.6 KB  | Cache First (precache candidate)                    |
| Notification sound  | `/notification.mp3`                                                         | 1     | 4.9 KB  | Cache First                                         |
| Hero / background   | `/coffee-bg.jpg`, `/coffee-bg.mp4`                                          | 2     | ~1.4 MB | Cache First (large — lazy load)                     |
| Menu product images | `/public/images/*.avif`                                                     | 75    | ~3.5 MB | **Cache First** (immutable content-addressed names) |
| Robots              | `/robots.txt`                                                               | 1     | 97 B    | Cache First                                         |

**Total `public/` size:** ~5.1 MB (5,129,446 bytes)

### 4.2 Fonts

| Source             | Details                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `next/font/google` | `Space_Grotesk`, `Inter` — subset latin, `display: swap`         |
| Delivery           | Self-hosted by Next.js build output under `/_next/static/media/` |

**Cache suitability:** Cache First via Next.js hashed static assets.

### 4.3 Remote Images

| Source                | Usage                                                     |
| --------------------- | --------------------------------------------------------- |
| `imageproxy.wolt.com` | Fallback in `src/data/menu.ts` when DB images unavailable |
| `images.unsplash.com` | Allowed in `next.config.js` `remotePatterns`              |

These are **not** in `public/` and require network unless separately cached by a future SW runtime cache.

### 4.4 Preload Candidates

| Asset                                     | Rationale                                         | Priority                  |
| ----------------------------------------- | ------------------------------------------------- | ------------------------- |
| `/icon-192.png`, `/icon-maskable-512.png` | Install + splash                                  | High                      |
| `/offline.html`                           | Driver offline fallback (currently not precached) | High                      |
| `/notification.mp3`                       | Driver/admin alert latency                        | Medium                    |
| `/coffee-bg.jpg` or AVIF hero             | LCP on home page                                  | Medium                    |
| Top 10 menu AVIFs by sort order           | Menu LCP                                          | Medium (SW precache list) |
| `/_next/static/css/*`                     | App shell                                         | Low (Next handles)        |

**Not recommended for preload:** `coffee-bg.mp4` (1.3 MB), full 75-image menu set (bandwidth).

---

## 5. Offline Readiness Audit

| Flow                        | Supported Offline?  | Reason                                                                                                                  | Required Changes                                                           |
| --------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Browse menu**             | **PARTIAL**         | Static `src/data/menu.ts` fallback when Supabase fails; images in `/public/images/` may load from HTTP cache but not SW | Precache menu shell + critical images; IndexedDB for product catalog sync  |
| **Cart**                    | **YES**             | Zustand `persist` → `localStorage` key `juco-cart`                                                                      | None for basic persistence; surface offline indicator in UI                |
| **Checkout**                | **NO**              | Requires `createOrder`, address geocoding (Mapbox), payment (Viva)                                                      | Queue orders offline (complex); at minimum block submit with clear UX      |
| **Order tracking**          | **NO**              | Supabase realtime + live GPS + Mapbox                                                                                   | None offline — show "connection required"                                  |
| **Driver dashboard**        | **PARTIAL**         | SW caches last 3 driver HTML shells; offline queue for delivery actions + GPS buffer                                    | Wire `setPwaDeliveryActive`; precache `offline.html`; mount `usePWAUpdate` |
| **Driver login**            | **PARTIAL**         | SW may serve cached login page; auth requires network                                                                   | Optional offline message on login form                                     |
| **Admin dashboard**         | **NO**              | Realtime orders, server actions, no offline layer                                                                       | Not recommended for offline                                                |
| **Customer authentication** | **NO**              | Supabase auth requires network                                                                                          | Standard offline login impossible without prior session token              |
| **Payment (Viva)**          | **NO**              | External redirect to Viva hosted checkout                                                                               | N/A                                                                        |
| **Notification sounds**     | **YES** (if cached) | Local MP3 + localStorage settings                                                                                       | Precache `/notification.mp3`                                               |

---

## 6. Current Browser APIs Usage

### 6.1 `navigator.*`

| API                           | File(s)                                                                           | Usage                                 |
| ----------------------------- | --------------------------------------------------------------------------------- | ------------------------------------- |
| `navigator.serviceWorker`     | `usePwaInstall.ts`, `usePWAUpdate.ts`, `pwa-legacy-purge.ts`, `PwaDevCleanup.tsx` | SW register/unregister                |
| `navigator.onLine`            | `useNetworkStatus.ts`, `offline-queue.service.ts`, `useDriverRealtime.ts`         | Online/offline detection              |
| `navigator.connection`        | `useNetworkStatus.ts`                                                             | `effectiveType` / connection change   |
| `navigator.geolocation`       | `gps.service.ts`                                                                  | `watchPosition`, `getCurrentPosition` |
| `navigator.permissions.query` | `gps.service.ts`                                                                  | Geolocation permission state          |
| `navigator.wakeLock.request`  | `useWakeLock.ts`                                                                  | Screen wake during active delivery    |
| `navigator.userAgent`         | `PwaInstallBanner.tsx`                                                            | iOS detection                         |

### 6.2 `Notification` / `PushManager`

| API                   | Status                                                                |
| --------------------- | --------------------------------------------------------------------- |
| `window.Notification` | ❌ Not used (class name collision only in `NotificationSoundService`) |
| `PushManager`         | ❌ Not used                                                           |

### 6.3 `Geolocation`

| File                                            | Usage                    |
| ----------------------------------------------- | ------------------------ |
| `src/features/delivery/services/gps.service.ts` | Core GPS tracking        |
| `src/features/delivery/hooks/useGPS.ts`         | React hook wrapper       |
| `src/features/delivery/hooks/useDriverPage.ts`  | Permission orchestration |
| `LocationPermissionModal`                       | UX for permission denial |

### 6.4 `ServiceWorker`

See Section 1. Registration active; update path incomplete.

### 6.5 `WakeLock`

| File                                         | Usage                                          |
| -------------------------------------------- | ---------------------------------------------- |
| `src/features/delivery/hooks/useWakeLock.ts` | Active when `isOnDelivery`                     |
| `app/driver/(app)/page.tsx`                  | Displays wake lock status in `DriverStatsCard` |

### 6.6 `Battery`

❌ Not used.

### 6.7 Background Sync

❌ `registration.sync` not used. Custom localStorage queue instead (`offline-queue.service.ts`).

### 6.8 `localStorage`

| Key / Area                                   | File                                      |
| -------------------------------------------- | ----------------------------------------- |
| `juco-cart`                                  | `src/lib/cart-store.ts` (Zustand persist) |
| `driver_session`                             | `src/lib/auth/driver-session.ts`          |
| `admin_session`                              | `src/lib/auth/admin-session.ts`           |
| `driver_offline_queue`, `offline_gps_buffer` | `offline-queue.service.ts`                |
| `driver_optimistic_delivery`                 | `driver-offline-state.ts`                 |
| Geocode cache                                | `order-destination.service.ts`            |
| Notification sound settings                  | `notification-sound.service.ts`           |

### 6.9 `sessionStorage`

| Key                     | File                                             |
| ----------------------- | ------------------------------------------------ |
| `pwa_install_dismissed` | `PwaInstallBanner.tsx`                           |
| `juco_legacy_purge_v3`  | `pwa-legacy-purge.ts`                            |
| `pendingOrder`          | `useCheckoutSubmit.ts`, `order-success/page.tsx` |

### 6.10 `IndexedDB`

❌ Not used anywhere in codebase.

---

## 7. Manifest Recommendations

### 7.1 Strategy: Dual Manifest vs Unified

**Recommendation:** **Two manifests** or **one unified manifest with role-based shortcuts** — current single driver manifest is incorrect for site-wide PWA.

### 7.2 Customer Manifest (proposed)

```json
{
  "name": "Juco — Fresh Juices & Coffee",
  "short_name": "Juco",
  "id": "/",
  "description": "Order fresh juices, specialty coffee & snacks in Nafpaktos",
  "start_url": "/?utm_source=pwa",
  "scope": "/",
  "display": "standalone",
  "background_color": "#1a1612",
  "theme_color": "#E8F529",
  "orientation": "any",
  "categories": ["food", "shopping"],
  "icons": [
    /* existing 192, 512, maskable */
  ],
  "shortcuts": [
    { "name": "Order Now", "url": "/" },
    { "name": "My Orders", "url": "/account/orders" }
  ]
}
```

### 7.3 Driver Manifest (proposed — refine existing)

```json
{
  "name": "Juco Cafe Driver",
  "short_name": "Juco Driver",
  "id": "/driver",
  "start_url": "/driver/login?utm_source=pwa",
  "scope": "/driver/",
  "display": "standalone",
  "orientation": "portrait",
  "shortcuts": [
    { "name": "Dashboard", "url": "/driver" },
    { "name": "Go Online", "url": "/driver" }
  ]
}
```

**Critical fix:** Narrow `scope` to `/driver/` so customer and driver installs do not conflict.

### 7.4 Additional Manifest Fields

| Field                         | Recommendation                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `screenshots`                 | Add 2–4 mobile screenshots (menu, tracking, driver dashboard) for richer install UI (Chrome)       |
| `share_target`                | Optional — `action: /checkout`, `params: { title: "text", url: "url" }` for shared addresses/links |
| `prefer_related_applications` | `false`                                                                                            |
| `lang` / `dir`                | `el`, `ltr`                                                                                        |
| `display_override`            | `["standalone", "minimal-ui"]`                                                                     |

### 7.5 Route-Specific Linking

| Route group                 | Manifest link               |
| --------------------------- | --------------------------- |
| `app/layout.tsx` (customer) | `/manifest.json` (customer) |
| `app/driver/**/layout.tsx`  | `/manifest-driver.json`     |

Use Next.js `metadata.manifest` per layout segment.

---

## 8. Install Experience

### 8.1 Current Install Flow

```
User visits any page
  → Root layout loads manifest (driver-branded)
  → usePwaInstall registers /sw.js
  → PwaInstallBanner shows if:
       - Not standalone
       - Not dismissed (sessionStorage)
       - beforeinstallprompt fired OR iOS detected
  → User installs → start_url /driver/login (driver app)
```

### 8.2 Standalone Detection

- **Implemented:** `PwaInstallBanner` only (hides banner)
- **Not implemented:** Route-specific UI, analytics, or deep-link handling for installed mode

### 8.3 Platform Support

| Platform           | Support    | Notes                                                                                 |
| ------------------ | ---------- | ------------------------------------------------------------------------------------- |
| **Android Chrome** | ⚠️ Partial | SW + manifest meet install criteria; wrong branding/start URL for customers           |
| **iOS Safari**     | ⚠️ Partial | Manual Add to Home Screen instructions shown; `appleWebApp.capable: true` in metadata |
| **Desktop Chrome** | ⚠️ Partial | Installable but driver-focused                                                        |
| **Dev / tunnel**   | ⚠️ Risky   | `PwaDevCleanup` not mounted — stale SW possible over zrok + `next dev`                |

### 8.4 Recommended Improvements

1. **Split install banners** — customer vs driver copy and targeting (`pathname.startsWith('/driver')`)
2. **Scope manifests** — driver `scope: /driver/` prevents customer PWA controlling driver routes
3. **Mount `PwaDevCleanup`** in dev layout or tunnel script
4. **Add `apple-touch-icon`** dedicated 180×180 asset (iOS prefers this over 192)
5. **iOS meta tags** — `mobile-web-app-capable` (legacy) already via `appleWebApp`
6. **Post-install onboarding** — deep link to correct role dashboard
7. **Track install events** — `appinstalled` event (not currently listened)

---

## 9. Push Notification Readiness

### 9.1 Event Coverage vs Architecture

| Event                    | Realtime Today                                 | Web Push Ready? | Missing Pieces                                                                                                                |
| ------------------------ | ---------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Order updates (customer) | ✅ `useRealtimeOrder` on `/track/*`            | ❌              | Push subscription, SW `push` handler, VAPID keys, backend sender (Supabase Edge Function or dedicated service), permission UX |
| Driver assignment        | ✅ `useDriverRealtime` + sound                 | ❌              | Same as above; must work when app backgrounded                                                                                |
| Delivery started         | ✅ Delivery assignment realtime                | ❌              | Push payload schema, click action → `/track/[id]`                                                                             |
| Delivered                | ✅ Order status realtime + sound on track page | ❌              | Push + badge API (optional)                                                                                                   |

### 9.2 What Exists (In-App Only)

- `notification-sound.service.ts` — plays `/notification.mp3` on Supabase events
- Settings in driver + admin + account profile pages
- Deduplication via `realtimeNotificationKeys`
- Requires tab open (or PWA foreground) — **not true push**

### 9.3 Missing Infrastructure Checklist

| Component                                | Status                 |
| ---------------------------------------- | ---------------------- |
| VAPID key pair                           | ❌                     |
| `push_subscriptions` DB table            | ❌                     |
| API route to save subscription           | ❌                     |
| SW `push` + `notificationclick` handlers | ❌                     |
| `Notification.requestPermission` flow    | ❌                     |
| Server-side push dispatcher              | ❌                     |
| iOS Web Push (16.4+ PWA) testing         | ❌                     |
| User preference per notification type    | ❌ (only sound on/off) |

**Estimated effort:** Medium–High (backend + SW + permission UX + cross-platform QA)

---

## 10. Service Worker Strategy Proposal

> **Do not implement yet.** Recommendations for a future unified SW (likely extending `generate-sw.mjs` or adopting Workbox).

| Path pattern                          | Strategy                                              | Rationale                                                                      |
| ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `/`                                   | **Stale While Revalidate**                            | Menu page benefits from fast repeat visits; `menu.ts` + SW cache as safety net |
| `/checkout`                           | **Network First**                                     | Dynamic form, geocoding, payment — always prefer fresh                         |
| `/track/*`                            | **Network First**                                     | Realtime data; cache would show stale driver position                          |
| `/driver/*`                           | **Network First** (shell) + offline queue (app layer) | Matches current impl; extend precache for `offline.html`                       |
| `/admin/*`                            | **Network First**                                     | Admin must never see stale orders                                              |
| `/api/*`                              | **No Store**                                          | Mutations and auth                                                             |
| `/images/*`                           | **Cache First**                                       | 75 AVIFs, immutable filenames, ~3.5 MB — version cache name on deploy          |
| `/fonts/*` or `/_next/static/media/*` | **Cache First**                                       | Hashed Next.js font files                                                      |
| `/_next/static/*`                     | **Cache First** (prod only)                           | Standard Next PWA pattern; **never in dev**                                    |
| `/_next/data/*`                       | **Network First**                                     | RSC flight data must be fresh                                                  |
| `/notification.mp3`                   | **Cache First**                                       | Small, static                                                                  |
| `/manifest.json`                      | **Network First**                                     | Allow manifest updates without SW bump                                         |
| `/sw.js`                              | **No Store**                                          | Already enforced                                                               |
| Supabase REST / Realtime              | **No Store** (bypass)                                 | Never intercept `*.supabase.co`                                                |
| Mapbox / Google Maps                  | **No Store** (bypass)                                 | Third-party tiles/APIs                                                         |

### 10.1 SW Architecture Notes

- Keep **driver delivery actions** in application-layer `offline-queue.service.ts` — more reliable than Background Sync API (limited Safari support).
- Add `message` listener for `SKIP_WAITING` before enabling `usePWAUpdate`.
- Use **separate cache namespaces**: `juco-shell-v*`, `juco-images-v*`, `juco-driver-shell-v*`.
- Bump cache version via `NEXT_PUBLIC_SW_VERSION` (already in `next.config.js` env — currently unused in SW).

---

## Safe PWA Implementation Roadmap

### Phase 1 — Stabilize & Wire Existing (Low Risk)

**Goal:** Fix dead code paths and manifest/install mismatch without changing caching scope.

| Task                                                                                | Risk   |
| ----------------------------------------------------------------------------------- | ------ |
| Mount `usePWAUpdate` in production layout (driver layout or root with env guard)    | Low    |
| Add `SKIP_WAITING` message handler to `generate-sw.mjs` template                    | Low    |
| Wire `setPwaDeliveryActive(true/false)` from `useDriverPage` during active delivery | Low    |
| Mount `PwaDevCleanup` in dev (`app/layout.tsx` conditional)                         | Low    |
| Split `PwaInstallBanner` copy by route (`/driver` vs customer)                      | Low    |
| Precache `/offline.html` in SW `install` event                                      | Low    |
| Create `manifest-customer.json` + `manifest-driver.json`; link per layout           | Medium |

**Estimated risk:** **Low** — mostly wiring existing code; no new dependencies.

---

### Phase 2 — Customer PWA Shell (Medium Risk)

**Goal:** Installable customer app with offline menu browse + cart.

| Task                                                                       | Risk   |
| -------------------------------------------------------------------------- | ------ |
| Extend SW to cache `/` navigation shell (not `/_next` in dev)              | Medium |
| Cache First strategy for `/images/*` with size budget (~5 MB cap)          | Medium |
| Offline indicator component using `useNetworkStatus` on customer routes    | Low    |
| Customer install banner + manifest on root layout only                     | Low    |
| Menu data: cache last successful `getProducts()` in localStorage/IndexedDB | Medium |
| Block checkout submit offline with clear UX                                | Low    |
| iOS splash screens + `apple-touch-icon` 180×180                            | Low    |

**Estimated risk:** **Medium** — SW scope expansion can cause stale chunk bugs if `/_next` mishandled; test prod builds only.

---

### Phase 3 — Push & Advanced Offline (High Risk)

**Goal:** Background notifications and resilient driver/customer comms.

| Task                                                                          | Risk   |
| ----------------------------------------------------------------------------- | ------ |
| VAPID + `push_subscriptions` table + subscribe API                            | High   |
| SW `push` / `notificationclick` handlers                                      | High   |
| Supabase Edge Function or cron to dispatch pushes on order events             | High   |
| Permission UX on track page + driver app                                      | Medium |
| Evaluate IndexedDB for offline menu/catalog (replace localStorage limits)     | Medium |
| Optional: Background Sync for driver queue (Safari fallback to current queue) | Medium |
| `share_target` for address sharing into checkout                              | Low    |

**Estimated risk:** **High** — cross-platform push behavior, subscription lifecycle, security review for VAPID private key storage.

---

## Appendix A — Key File Index

| Concern                 | Path                                                      |
| ----------------------- | --------------------------------------------------------- |
| Root layout + PWA mount | `app/layout.tsx`                                          |
| Middleware + SW headers | `middleware.ts`                                           |
| SW source generator     | `scripts/generate-sw.mjs`                                 |
| SW runtime              | `public/sw.js`                                            |
| Manifest                | `public/manifest.json`                                    |
| Offline page            | `public/offline.html`                                     |
| SW registration         | `src/components/ServiceWorkerRegistration.tsx`            |
| Install banner          | `src/components/PwaInstallBanner.tsx`                     |
| Update hook (unwired)   | `src/hooks/usePWAUpdate.ts`                               |
| Dev cleanup (unwired)   | `src/components/PwaDevCleanup.tsx`                        |
| Delivery-aware updates  | `src/lib/pwa-update-guard.ts`                             |
| Offline queue           | `src/features/delivery/services/offline-queue.service.ts` |
| Cart persistence        | `src/lib/cart-store.ts`                                   |
| Static menu fallback    | `src/data/menu.ts`                                        |
| Realtime                | `src/integrations/supabase/services/realtime.service.ts`  |
| Payment API             | `app/api/viva/route.ts`                                   |

## Appendix B — Build Pipeline

```
bun run build
  └── prebuild
        ├── scripts/ensure-notification-sound.mjs
        └── scripts/generate-sw.mjs  → writes public/sw.js
  └── next build
```

No `next-pwa`, Workbox, or `@ducanh2912/next-pwa` dependency present.

---

_End of PWA Discovery Report_
