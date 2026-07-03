# PWA Implementation Report

**Date:** 2026-06-26  
**Scope:** Safe site-wide customer PWA + preserved driver PWA  
**Validation:** `npm run build` ✅ · `npx tsc --noEmit` ✅

---

## Summary

Implemented Phases 1–7 incrementally using the existing custom SW pipeline (`scripts/generate-sw.mjs` → `public/sw.js`). No third-party PWA frameworks were added. Driver offline shell, delivery queue, and GPS behavior are unchanged.

---

## Modified Files

| File                                                     | Change                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `scripts/generate-sw.mjs`                                | Extended SW: precache, SKIP_WAITING, customer SWR + image cache, driver shell preserved         |
| `public/sw.js`                                           | Auto-generated from script above                                                                |
| `app/layout.tsx`                                         | Customer manifest, `PwaDevCleanup`, `CustomerOfflineIndicator`, `usePWAUpdate` via registration |
| `app/driver/layout.tsx`                                  | **New** — driver manifest metadata                                                              |
| `app/offline/page.tsx`                                   | **New** — customer offline fallback page                                                        |
| `app/checkout/page.tsx`                                  | Offline submit guard UI                                                                         |
| `src/components/ServiceWorkerRegistration.tsx`           | Mount `usePWAUpdate` alongside `usePwaInstall`                                                  |
| `src/components/PwaInstallBanner.tsx`                    | Route-aware customer/driver copy, analytics logs, separate dismiss keys                         |
| `src/components/CustomerOfflineIndicator.tsx`            | **New** — customer-only offline banner                                                          |
| `src/hooks/useIsStandalone.ts`                           | **New** — Android + iOS standalone detection                                                    |
| `src/features/delivery/hooks/useDriverPage.ts`           | Wire `setPwaDeliveryActive` to active delivery                                                  |
| `src/features/checkout/hooks/useCheckoutSubmit.ts`       | Block submit when offline                                                                       |
| `src/features/checkout/components/StickyCheckoutCta.tsx` | `disabled` + `disabledReason` props                                                             |

## New Files

| File                                          | Purpose                                 |
| --------------------------------------------- | --------------------------------------- |
| `public/manifest-customer.json`               | Customer PWA manifest (`start_url: /`)  |
| `public/manifest-driver.json`                 | Driver PWA manifest (`scope: /driver/`) |
| `app/driver/layout.tsx`                       | Route-level driver manifest link        |
| `app/offline/page.tsx`                        | Customer offline UX                     |
| `src/components/CustomerOfflineIndicator.tsx` | Non-intrusive offline banner            |
| `src/hooks/useIsStandalone.ts`                | Standalone mode hook                    |

## Unchanged (Preserved)

| Area                                                      | Notes                                            |
| --------------------------------------------------------- | ------------------------------------------------ |
| `src/features/delivery/services/offline-queue.service.ts` | Driver offline queue untouched                   |
| `app/api/viva/route.ts`                                   | Payment flow untouched                           |
| Supabase realtime hooks/services                          | Untouched                                        |
| `src/lib/cart-store.ts`                                   | Zustand `juco-cart` persistence unchanged        |
| `public/offline.html`                                     | Still used as SW fallback for driver + precached |
| `public/manifest.json`                                    | Legacy file retained (not linked from layouts)   |

---

## Manifest Changes

### Customer — `public/manifest-customer.json`

Linked from `app/layout.tsx`:

| Field              | Value                                          |
| ------------------ | ---------------------------------------------- |
| `name`             | Juco Cafe                                      |
| `short_name`       | Juco                                           |
| `id`               | `/`                                            |
| `start_url`        | `/`                                            |
| `scope`            | `/`                                            |
| `display`          | standalone                                     |
| `theme_color`      | `#E8F529`                                      |
| `background_color` | `#1a1612`                                      |
| `categories`       | food, shopping                                 |
| Shortcuts          | Order Now → `/`, My Orders → `/account/orders` |

### Driver — `public/manifest-driver.json`

Linked from `app/driver/layout.tsx`:

| Field        | Value                       |
| ------------ | --------------------------- |
| `name`       | Juco Cafe Driver            |
| `short_name` | Juco Driver                 |
| `id`         | `/driver`                   |
| `start_url`  | `/driver/login`             |
| `scope`      | `/driver/`                  |
| `display`    | standalone                  |
| Shortcuts    | Go Online → `/driver/login` |

**Install isolation:** Customer installs launch `/`. Driver installs are scoped to `/driver/` and launch `/driver/login`.

---

## Service Worker Changes

**Generator:** `scripts/generate-sw.mjs` (runs on `prebuild`)

### Cache Namespaces

| Namespace              | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `juco-shell-v1`        | Customer home SWR + precache bucket       |
| `juco-images-v1`       | `/images/*` cache-first (max 120 entries) |
| `juco-driver-shell-v1` | Driver navigation shell (max 3 entries)   |

### Install Precache

- `/offline.html`
- `/icon-192.png`
- `/icon-512.png`
- `/notification.mp3`

### Fetch Rules

| Pattern                                           | Strategy                   | Notes                     |
| ------------------------------------------------- | -------------------------- | ------------------------- |
| `/driver`, `/driver/*` navigate                   | **Network First** shell    | Unchanged driver behavior |
| `/` navigate                                      | **Stale While Revalidate** | Customer homepage         |
| `/images/*`                                       | **Cache First**            | Size cap: 120 entries     |
| `/_next/*`                                        | **Bypass**                 | Never intercepted         |
| `/api/*`                                          | **Bypass**                 | No cache                  |
| `/auth/*`                                         | **Bypass**                 | No cache                  |
| `/admin`, `/admin/*`                              | **Bypass**                 | No cache                  |
| `/checkout`, `/order-success`                     | **Bypass**                 | No cache                  |
| `/track/*`                                        | **Bypass**                 | No cache                  |
| External origins (Supabase, Mapbox, Google, Viva) | **Bypass**                 | Same-origin check only    |

### Update Flow

```js
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
```

Wired to `usePWAUpdate` → `applyPwaUpdate()` → `pwa-update-guard.ts`.

### Production-Only Update Hook

- `usePWAUpdate` mounted in `ServiceWorkerRegistration`
- Skips entirely when `NODE_ENV === 'development'`
- Defers reload during active delivery via `setPwaDeliveryActive(true)` in `useDriverPage`

### Development SW Cleanup

- `PwaDevCleanup` mounted in root layout (internally no-ops in production)
- Unregisters SW + clears caches before React in dev/tunnel

---

## Offline Capabilities

| Flow                    | Offline Support | Implementation                                                      |
| ----------------------- | --------------- | ------------------------------------------------------------------- |
| Customer homepage `/`   | **Partial**     | SWR shell cache; static `menu.ts` fallback in page logic (existing) |
| Customer `/offline`     | **Yes**         | Dedicated page with retry + home link                               |
| Menu images             | **Partial**     | Cache-first after first load                                        |
| Cart                    | **Yes**         | Zustand `localStorage` (`juco-cart`) — unchanged                    |
| Checkout submit         | **Blocked**     | UI disabled + submit guard with message                             |
| Order tracking          | **No**          | Bypassed by SW; requires network                                    |
| Driver dashboard        | **Partial**     | Unchanged — shell cache + offline queue                             |
| Driver delivery actions | **Partial**     | Unchanged — `offline-queue.service.ts`                              |
| Payment (Viva)          | **No**          | Unchanged — requires network                                        |
| Admin                   | **No**          | Unchanged                                                           |

---

## Install UX

| Route           | Banner Title        | Dismiss Key                      |
| --------------- | ------------------- | -------------------------------- |
| Customer routes | Install Juco        | `pwa_install_dismissed_customer` |
| `/driver/*`     | Install Juco Driver | `pwa_install_dismissed_driver`   |
| `/admin/*`      | Hidden              | —                                |
| Standalone mode | Hidden              | `useIsStandalone()`              |

**Analytics (console only):**

- `[PWA] beforeinstallprompt fired` — route + variant
- `[PWA] appinstalled` — route + variant

**Platforms:**

- Android: `beforeinstallprompt` + Install button
- iOS: Share → Add to Home Screen instructions

---

## Manual Testing Checklist

### 1. Customer install

- [ ] Open `/` in Chrome (production build or deployed preview)
- [ ] Confirm manifest is `manifest-customer.json` (DevTools → Application → Manifest)
- [ ] Install prompt shows **"Install Juco"**
- [ ] Installed app opens at `/` (not `/driver/login`)

### 2. Driver install

- [ ] Open `/driver/login`
- [ ] Confirm manifest is `manifest-driver.json`
- [ ] Install prompt shows **"Install Juco Driver"**
- [ ] Installed app opens at `/driver/login`
- [ ] Scope is `/driver/`

### 3. Offline homepage

- [ ] Visit `/` online (production + SW active)
- [ ] Go offline (DevTools → Network → Offline)
- [ ] Reload `/` — cached shell or `/offline.html` fallback loads
- [ ] Navigate to `/offline` — retry + home buttons work

### 4. Offline cart persistence

- [ ] Add items to cart online
- [ ] Go offline
- [ ] Refresh — cart count and items remain (`juco-cart` in localStorage)

### 5. Driver active delivery update deferral

- [ ] Driver accepts order and starts delivery
- [ ] Deploy new SW version (or bump `public/sw.js`)
- [ ] Confirm update toast says delivery-deferred message
- [ ] Complete delivery — update can apply on user action

### 6. SW update flow

- [ ] Production: register SW, deploy new `sw.js`
- [ ] Confirm update toast appears
- [ ] Tap update — page reloads with new SW
- [ ] Confirm `SKIP_WAITING` activates waiting worker

### 7. Android install

- [ ] `beforeinstallprompt` logged in console
- [ ] Install button works
- [ ] `appinstalled` logged after accept

### 8. iOS install

- [ ] Safari shows Share → Add to Home Screen hint
- [ ] Added icon launches correct start URL per route visited

### 9. Payment flow

- [ ] Checkout with card — Viva redirect still works
- [ ] Checkout with COD — order creates and redirects to `/track/[id]`
- [ ] No SW interception on `/api/viva`

### 10. Order tracking freshness

- [ ] Open `/track/[orderId]` online
- [ ] Confirm realtime updates still arrive
- [ ] SW does not serve stale tracking page from cache

### Additional checks

- [ ] `bun run tunnel` / `next dev` — no stale SW (PwaDevCleanup active)
- [ ] Checkout offline — submit disabled, message shown
- [ ] Customer offline banner appears on `/`, not on `/driver`
- [ ] Driver offline queue still syncs on reconnect

---

## Build Validation

```
node scripts/generate-sw.mjs   ✅
npm run build                  ✅ (21 routes, /offline static)
npx tsc --noEmit               ✅
```

---

## Risk Notes

| Item                   | Risk | Mitigation                                                           |
| ---------------------- | ---- | -------------------------------------------------------------------- |
| Customer `/` SWR       | Low  | Only homepage navigation cached; `/_next` bypassed                   |
| Image cache growth     | Low  | 120-entry trim cap                                                   |
| Dual manifest          | Low  | Route-level metadata in separate layouts                             |
| Double SW registration | None | `register()` is idempotent                                           |
| Driver regression      | Low  | Driver path handled first in fetch handler; same network-first logic |

---

_End of implementation report_
