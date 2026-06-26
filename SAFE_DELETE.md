# Deletion-Safety Audit

Audit date: 2026-06-25

Scope: cleanup candidates from the checkout, tracking/delivery, auth/database, and bundle hygiene audits.

No application source code was modified by this audit. This file is the audit report requested before deletion.

## Methodology

For each cleanup candidate I checked:

- Static imports: `import ... from`, relative imports, alias imports.
- Dynamic imports: `import("...")`.
- Re-exports/barrels: `export ... from`.
- Route reachability: App Router files under `app/**/page.tsx`, `layout.tsx`, `route.ts`.
- Middleware/server-action/string references.
- Legacy-cluster references: imports that only occur inside files already classified as safe-delete are not counted as active runtime importers.
- Documentation mentions are not counted as runtime reachability.

Counts below mean:

- **Import count**: active runtime importers outside the same safe-delete legacy cluster.
- **Route count**: route entries directly created by that file.
- **Dynamic import count**: active `import(...)` references.
- **Export usage count**: active imports/usages of the file's exported symbols outside the same safe-delete legacy cluster.

## Safe To Delete

These files have no active runtime import path, no dynamic import path, and no route reachability. Some are already marked `D` in the working tree.

| File | Reason | Import count | Route count | Dynamic import count | Export usage count | Risk level |
|---|---|---:|---:|---:|---:|---|
| `src/features/checkout/components/CartStep.tsx` | Old checkout step. New `/checkout` route uses `EmptyCart`, `ReviewStep`, and section components instead. | 0 | 0 | 0 | 0 | Low |
| `src/features/checkout/components/CheckoutStepper.tsx` | Old stepper flow. New checkout has no stepper or `CheckoutStep` state. | 0 | 0 | 0 | 0 | Low |
| `src/features/checkout/components/DeliveryStep.tsx` | Old combined delivery/contact/address step. Replaced by `ContactStep`, `AddressStep`, and `DeliveryInstructionsStep`. | 0 | 0 | 0 | 0 | Low |
| `src/features/checkout/hooks/useCheckoutFlow.ts` | Old checkout orchestration hook. New route calls `useCheckoutForm`, `useCheckoutValidation`, and `useCheckoutSubmit` directly. | 0 | 0 | 0 | 0 | Low |
| `src/features/checkout/store/checkout-location-store.ts` | Only imported by old `DeliveryStep` and old `CheckoutLocationPicker`, both in the same delete cluster. | 0 | 0 | 0 | 0 | Low |
| `src/features/maps/components/CheckoutLocationPicker.tsx` | Old checkout map picker. Active checkout imports `src/features/location/components/CheckoutAddressPicker.tsx`. | 0 | 0 | 0 | 0 | Low |
| `src/hooks/useCheckoutLogic.ts` | Old monolithic checkout logic. Replaced by `useCheckoutSubmit`. Only referenced old `paymentService.ts`. | 0 | 0 | 0 | 0 | Low |
| `src/services/paymentService.ts` | Legacy Viva service. Active flow uses `src/integrations/viva/services/payment.service.ts` and `payment.server.ts`. | 0 | 0 | 0 | 0 | Low |
| `src/features/maps/components/AddressAutocomplete.tsx` | Old maps autocomplete component. Only used by old checkout maps chain. Active address autocomplete lives in `src/features/location/components`. | 0 | 0 | 0 | 0 | Low |
| `src/features/maps/components/GoogleMap.tsx` | Old checkout Google map component. Active tracking uses `TrackingMap` plus provider renderers. | 0 | 0 | 0 | 0 | Low |
| `src/features/maps/components/LocationButton.tsx` | Old maps location button. Only uses old `src/features/maps/hooks/useLocation.ts`. | 0 | 0 | 0 | 0 | Low |
| `src/features/maps/hooks/useAddressAutocomplete.ts` | Old Google autocomplete hook. Only used by old maps autocomplete and old checkout picker. | 0 | 0 | 0 | 0 | Low |
| `src/features/maps/hooks/useMapState.ts` | Old maps store subscription hook. Only used by old checkout picker. | 0 | 0 | 0 | 0 | Low |
| `src/features/maps/hooks/useLocation.ts` | Old maps location hook. Only used by old `LocationButton`. | 0 | 0 | 0 | 0 | Low |
| `src/features/maps/store/maps-store.ts` | Old map UI store. Only used by old Google map/location hooks. | 0 | 0 | 0 | 0 | Low |
| `src/features/maps/engine/GeocodingService.ts` | No active imports or instantiations. `MapEngine` only mentions geocoding in comments. | 0 | 0 | 0 | 0 | Low |
| `src/hooks/useGoogleMaps.ts` | Old Google Maps script hook. Only used by old `GoogleMap.tsx`. | 0 | 0 | 0 | 0 | Low |
| `src/features/maps/types/maps.types.ts` | No active imports found. | 0 | 0 | 0 | 0 | Low |
| `src/features/maps/types/map-state.ts` | Deprecated map state type. No active imports found. | 0 | 0 | 0 | 0 | Low |
| `src/features/maps/utils/trail.ts` | No active imports found. Current tracking trail comes from snapshot/location history paths. | 0 | 0 | 0 | 0 | Low |
| `src/hooks/useLocation.ts` | Top-level old location hook. No active imports found. | 0 | 0 | 0 | 0 | Low |
| `src/routeTree.gen.ts` | TanStack Router generated artifact. Project uses Next.js App Router. No active imports found. | 0 | 0 | 0 | 0 | Low |
| `app/actions/record-driver-location.ts` | Deprecated server action. Active GPS flow uses `src/features/delivery/services/record-driver-location.ts` and `gps-repository.ts`. | 0 | 0 | 0 | 0 | Low |
| `src/features/delivery/hooks/useDriverAssignment.ts` | File is explicitly marked legacy. No active importers found. | 0 | 0 | 0 | 0 | Low |
| `src/features/delivery/hooks/useWorkflow.ts` | No active importers found. Admin uses `workflow.service.ts` directly. | 0 | 0 | 0 | 0 | Low |
| `src/features/delivery/components/DeliveryStatusText.tsx` | No active importers found. It is the only importer of `useDeliveryProgress`. | 0 | 0 | 0 | 0 | Low |
| `src/features/delivery/hooks/useDeliveryProgress.ts` | Only imported by `DeliveryStatusText.tsx`, which has no active importers. | 0 | 0 | 0 | 0 | Low |
| `src/features/delivery/validation/delivery.validation.ts` | No active imports found. | 0 | 0 | 0 | 0 | Low |
| `src/features/delivery/core/index.ts` | Barrel file only. No active imports of the barrel found. Direct module imports are used instead. | 0 | 0 | 0 | 0 | Low |
| `src/components/ThemeToggle.tsx` | No active imports found. | 0 | 0 | 0 | 0 | Low |
| `src/shared/hooks/useDebounce.ts` | No active imports found. | 0 | 0 | 0 | 0 | Low |
| `src/shared/hooks/useLocalStorage.ts` | No active imports found. | 0 | 0 | 0 | 0 | Low |
| `src/shared/utils/format.ts` | No active imports found. Local formatting helpers are used instead. | 0 | 0 | 0 | 0 | Low |
| `src/lib/retry.util.ts` | No active imports found. | 0 | 0 | 0 | 0 | Low |
| `src/lib/error-handler.util.ts` | No active imports found. | 0 | 0 | 0 | 0 | Low |
| `src/lib/error-capture.ts` | No active imports found. | 0 | 0 | 0 | 0 | Low |
| `src/lib/error-page.ts` | No active imports found. | 0 | 0 | 0 | 0 | Low |
| `src/lib/lovable-error-reporting.ts` | No active imports found. | 0 | 0 | 0 | 0 | Low |
| `src/lib/config.server.ts` | No active imports found. Looks like leftover server config helper. | 0 | 0 | 0 | 0 | Low |
| `src/integrations/supabase/services/image-upload.service.ts` | No active imports found. | 0 | 0 | 0 | 0 | Low |
| `src/vite-env.d.ts` | Vite ambient type leftover. Project is Next.js and no active Vite entry path was found. | 0 | 0 | 0 | 0 | Low |
| `src/features/cart/components/CartFab.tsx` | Duplicate cart FAB. Active home page imports `src/components/CartFab.tsx`, not this file. | 0 | 0 | 0 | 0 | Low |

## Safe To Archive / Trim, Not Direct Delete Yet

These are likely cleanup targets, but deleting the whole file directly can break active code or planned architecture. Trim exports or archive after a focused refactor.

| File | Classification | Reason | Import count | Route count | Dynamic import count | Risk level |
|---|---|---|---:|---:|---:|---|
| `src/integrations/supabase/services/delivery.service.ts` | Safe To Archive / Trim | Active export: `getAvailableOrdersForDrivers`. Several other exports are legacy or feed dead hooks. Do not delete the file wholesale. | 1+ | 0 | 0 | Medium |
| `src/features/delivery/services/workflow.service.ts` | Safe To Archive / Trim | Active admin kitchen transition path remains. Delivery transition wrapper half is legacy. | 1+ | 0 | 0 | Medium |
| `app/actions/driver-workflow.ts` | Safe To Archive / Trim | Keep `driverTransitionAtomic`; legacy exports have no external importers. | 2+ | 0 | 1 dynamic via offline sync | Medium |
| `src/integrations/supabase/services/driver.service.ts` | Safe To Archive / Trim | Availability/location updates are active; several admin/stat helpers appear unused. | 1+ | 0 | 0 | Medium |
| `src/integrations/supabase/services/order.service.ts` | Safe To Archive / Trim | `createOrder`, `getOrderById`, and `getUserOrders` are active. Some helpers have zero importers. | 3+ | 0 | 0 | Medium |
| `src/integrations/supabase/services/realtime.service.ts` | Safe To Archive / Trim | Core realtime service is active. Some methods such as generic delivery subscriptions appear unused. | 3+ | 0 | 0 | Medium |
| `src/hooks/usePWAUpdate.ts` | Safe To Archive / Decision Needed | Implemented but not actively mounted. Either wire it into layout or delete in a PWA cleanup pass. | 0 | 0 | 0 | Medium |
| `src/components/PwaDevCleanup.tsx` | Safe To Archive / Decision Needed | Implemented but not mounted. Mentioned only by PWA update comments. | 0 | 0 | 0 | Medium |
| `src/config/env.ts` | Safe To Archive / Manual Check | No active import found, but environment helpers can be string-referenced or reintroduced. Archive first. | 0 | 0 | 0 | Low |
| `src/integrations/google-maps/services/googleMaps.service.ts` | Safe To Archive after legacy maps delete | Only imported by old maps hooks in the delete cluster. Keep until that cluster is removed in one pass. | 0 active | 0 | 0 | Low |

## Keep

These appeared in cleanup discussions but are active or required by current architecture.

| File | Reason | Import count | Route count | Dynamic import count | Risk level |
|---|---|---:|---:|---:|---|
| `app/checkout/page.tsx` | Active `/checkout` route. | N/A | 1 | 0 | Critical |
| `src/features/checkout/components/AddressStep.tsx` | Active new checkout component. | 1 | 0 | 0 | Critical |
| `src/features/checkout/components/ContactStep.tsx` | Active new checkout component. | 1 | 0 | 0 | Critical |
| `src/features/checkout/components/DeliveryInstructionsStep.tsx` | Active new checkout component. | 1 | 0 | 0 | Critical |
| `src/features/checkout/components/FulfillmentStep.tsx` | Active new checkout component. | 1 | 0 | 0 | Critical |
| `src/features/checkout/components/ReviewStep.tsx` | Active new checkout component. | 1 | 0 | 0 | Critical |
| `src/features/checkout/components/StickyCheckoutCta.tsx` | Active new checkout CTA. | 1 | 0 | 0 | Critical |
| `src/features/checkout/components/PaymentStep.tsx` | Active checkout payment section. | 1 | 0 | 0 | Critical |
| `src/features/checkout/components/CheckoutField.tsx` | Active input component used by checkout sections. | 2+ | 0 | 0 | High |
| `src/features/checkout/components/PayOption.tsx` | Active selector component used by fulfillment/payment. | 2 | 0 | 0 | High |
| `src/features/checkout/components/EmptyCart.tsx` | Active empty checkout state. | 1 | 0 | 0 | High |
| `src/features/location/**` | Active Mapbox checkout address picker stack. | 1+ | 0 | 0 | Critical |
| `src/features/cart/components/CartItem.tsx` | Active in `ReviewStep`. It currently depends on `features/cart/hooks/useCart`, so do not delete without rewiring. | 1 active | 0 | 0 | High |
| `src/features/cart/components/CartSummary.tsx` | Active in `ReviewStep`. | 1 active | 0 | 0 | High |
| `src/features/cart/hooks/useCart.ts` | Active through `CartItem.tsx`. Do not delete until `CartItem` is rewired to `src/lib/cart-store.ts`. | 1 active | 0 | 0 | High |
| `src/features/cart/store/cart-store.ts` | Active through `features/cart/hooks/useCart.ts`. Duplicate architecture, but not safe to delete yet. | 1 active | 0 | 0 | High |
| `src/features/cart/types/cart.types.ts` | Active through duplicate feature cart store/hook. | 2 active | 0 | 0 | Medium |
| `src/lib/cart-store.ts` | Primary active cart store used by menu, checkout, order success, admin, account flows. | 10+ | 0 | 0 | Critical |
| `src/features/maps/components/TrackingMap.tsx` | Active driver/customer tracking map. | 2+ | 0 | 0 | Critical |
| `src/features/maps/tracking/tracking-map-renderer-factory.ts` | Active dynamic renderer factory. | 1 | 0 | 2 | Critical |
| `src/providers/mapbox/MapboxRenderer.ts` | Dynamically imported by renderer factory. | 0 static | 0 | 1 | Critical |
| `src/providers/google/create-google-tracking-renderer.ts` | Dynamically imported by renderer factory. | 0 static | 0 | 1 | Critical |
| `src/providers/google/GoogleMapsRenderer.ts` | Active through Google tracking renderer factory. | 1 | 0 | 0 | Critical |
| `src/features/maps/engine/MapEngine.ts` | Active Google tracking renderer support. | 1+ | 0 | 0 | Critical |
| `src/features/delivery/hooks/useDeliveryState.ts` | Active canonical delivery state hook. | 2+ | 0 | 0 | Critical |
| `src/features/delivery/core/compute-delivery-state.ts` | Active canonical delivery derivation. | 3+ | 0 | 0 | Critical |
| `src/features/delivery/core/use-canonical-delivery-locations.ts` | Active GPS history/realtime hook. | 1+ | 0 | 0 | Critical |
| `src/features/delivery/services/record-driver-location.ts` | Active GPS service. Do not confuse with deprecated `app/actions/record-driver-location.ts`. | 3 active | 0 | 0 | Critical |
| `src/features/delivery/services/offline-queue.service.ts` | Active offline queue. | 2+ | 0 | 1 | Critical |
| `src/features/delivery/services/driver-offline-actions.ts` | Active offline/driver action layer. | 1+ | 0 | 0 | Critical |
| `src/features/delivery/services/driver-offline-sync.ts` | Active offline sync layer with dynamic server-action imports. | 1+ | 0 | 3 | Critical |
| `src/features/driver/components/DriverGuard.tsx` | Active driver route-group guard. | 1+ | 0 | 0 | Critical |
| `src/lib/auth/driver-session.ts` | Active driver session/cookie helpers used by middleware and driver UI. | 4+ | 0 | 0 | Critical |
| `middleware.ts` | Active middleware for account/driver/sw routes. | N/A | N/A | 0 | Critical |
| `public/sw.js` | Runtime-active generated service worker. Do not delete; decide separately whether to track or generate in CI. | N/A | Route asset | 0 | High |

## Needs Manual Review

These may be removable, but route behavior, auth policy, or generated-file strategy must be confirmed first.

| File / Path | Reason | Import count | Route count | Dynamic import count | Risk level |
|---|---|---:|---:|---:|---|
| `app/driver/page.tsx` | Old flat driver route is already `D`, replaced by route groups. Because it is a route file, confirm `next build` and `/driver` routing before finalizing. | 0 | 1 if present | 0 | Medium |
| `app/driver/layout.tsx` | Old flat layout is already `D`, replaced by `app/driver/(app)/layout.tsx`. Confirm route-group behavior. | 0 | Layout if present | 0 | Medium |
| `app/driver/login/page.tsx` | Old flat login route is already `D`, replaced by `app/driver/(auth)/login/page.tsx`. Confirm middleware redirects resolve correctly. | 0 | 1 if present | 0 | Medium |
| `.next/**` | Generated build cache is modified in git. Do not delete locally as part of source cleanup; untrack from git index instead. | N/A | N/A | N/A | Low |
| `bun.lock` / package lock strategy | Both npm scripts and Bun lock state exist. Pick package manager before deleting lockfiles. | N/A | N/A | N/A | Medium |
| Unused shadcn/ui components | Many are zero-import scaffolding and not bundled. Removing them is repo hygiene only and may hurt future UI work. | 0 each | 0 | 0 | Low-Medium |
| Driver `auth.uid()` RLS policies | Device-login drivers currently use service-role RPCs, but live policy cleanup needs DB review and forward migrations. | N/A | N/A | N/A | High |
| Admin auth files (`admin-auth.ts`, `admin-session.ts`) | Active but security debt. Do not delete until admin auth is unified with Supabase/RLS or server actions. | active | active route support | 0 | High |

## Summary

- Highest confidence safe delete: old checkout stepper files, old checkout map picker chain, old `paymentService.ts`, deprecated `app/actions/record-driver-location.ts`, unused delivery wrapper hooks, zero-import utility files.
- Not safe yet: duplicate `features/cart` store/hook/types because active `CartItem.tsx` still depends on them.
- Not direct-delete: old `app/driver/*` flat route files until route-group migration is build-verified.
- Generated cleanup: `.next/**` should be untracked from git, not treated as source deletion.

Recommended next command before any actual deletion commit:

```bash
npx tsc --noEmit
```

Recommended smoke tests after deletion:

- `/checkout` delivery and pickup.
- Viva demo redirect and `/order-success`.
- `/driver/login`, `/driver`, accept order, delivery milestones.
- `/track/[orderId]` realtime status and GPS.
- `/admin` kitchen status transitions.
