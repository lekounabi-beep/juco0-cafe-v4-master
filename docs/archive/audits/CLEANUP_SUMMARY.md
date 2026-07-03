# CLEANUP_SUMMARY.md

**Date:** 2026-06-26  
**Approved scope:** Safe to remove + cart consolidation  
**Build:** `npm run build` — **PASS**  
**Typecheck:** `npx tsc --noEmit` — **PASS**  
**Lint:** `npm run lint` — **FAIL** (pre-existing repo-wide Prettier/CRLF issues; no new errors in changed files)

---

## What changed

### Cart consolidation (single source of truth)

| Action                  | Detail                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Canonical store**     | `src/lib/cart-store.ts` — all cart reads/writes                                             |
| **Added**               | `useCartItem(name)` hook exported from `lib/cart-store.ts`                                  |
| **Updated**             | `src/features/cart/components/CartItem.tsx` → imports `useCartItem` from `@/lib/cart-store` |
| **Unchanged consumers** | `ReviewStep.tsx` already used `useCart` from `@/lib/cart-store`                             |

**Result:** Checkout review step and cart line items now share one Zustand instance (`juco-cart` persist key). Eliminates split-brain cart state.

### Deleted files (11)

| File                                              | Reason                                    |
| ------------------------------------------------- | ----------------------------------------- |
| `src/providers/mapbox/destination-marker-icon.ts` | Legacy tracking orphan                    |
| `src/providers/mapbox/driver-marker-icon.ts`      | Legacy tracking orphan                    |
| `src/providers/mapbox/mapbox-config.ts`           | Legacy tracking orphan                    |
| `src/providers/mapbox/store-marker-icon.ts`       | Legacy tracking orphan                    |
| `src/features/maps/engine/types.ts`               | Legacy MapEngine orphan                   |
| `src/features/cart/components/CartFab.tsx`        | Duplicate of `src/components/CartFab.tsx` |
| `src/features/cart/hooks/useCart.ts`              | Replaced by `lib/cart-store`              |
| `src/features/cart/store/cart-store.ts`           | Duplicate Zustand store                   |
| `src/features/cart/types/cart.types.ts`           | Only used by removed store                |
| `src/shared/utils/client-architecture-guard.ts`   | Zero importers                            |

### Removed directories (empty after cleanup)

- `src/providers/mapbox/`, `src/providers/google/`, `src/providers/` (entire tree)
- `src/features/maps/engine/`, `components/`, `core/`, `tracking/`, `controllers/`, `engines/`, `guards/`, `hooks/`, `providers/`, `store/`, `types/`, `utils/`
- `src/features/cart/hooks/`, `store/`, `types/`

**Retained under `src/features/maps/`:** `debug/map-forensic-logger.ts`, `debug/map-data-usage.ts` (GPS pipeline).

### Modified files (4)

| File                                        | Change                                                             |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `src/lib/cart-store.ts`                     | Added `useCartItem` hook                                           |
| `src/features/cart/components/CartItem.tsx` | Import from canonical store                                        |
| `app/actions/complete-viva-order.ts`        | Removed `assertAdminAction` + unused `requireAdmin` helper/imports |
| `app/actions/driver-delivery-sync.ts`       | Removed `driverHasActiveDelivery` export                           |

---

## Intentionally NOT removed (per approval)

- PWA files (`PwaDevCleanup`, `usePWAUpdate`, `pwa-update-guard`, etc.)
- shadcn `src/components/ui/*` scaffolds
- Radix / npm dependencies
- `src/features/maps/debug/*`
- Documentation (`SAFE_DELETE.md`, `docs/*`, `CODE_AUDIT_REPORT.md`)

---

## Remaining `src/features/cart/` structure

```
src/features/cart/
  components/
    CartItem.tsx      ← uses @/lib/cart-store
    CartSummary.tsx   ← props-only display component
```

---

## Validation

```text
npm run build     → exit 0 (20 static pages generated)
npx tsc --noEmit  → exit 0
npm run lint      → exit 1 (pre-existing prettier/CRLF across repo)
```

### Manual smoke tests recommended

- [ ] Add items on `/` → checkout review step shows same quantities
- [ ] Adjust qty in review step → totals update correctly
- [ ] Complete order flow unchanged
- [ ] Driver / track pages unaffected

---

## Rollback

```bash
git checkout HEAD~1 -- src/lib/cart-store.ts src/features/cart/ app/actions/ src/providers/ src/features/maps/engine/ src/shared/utils/client-architecture-guard.ts
```

Or revert the cleanup commit if pushed.

---

## Follow-up (not in scope)

- Wire or remove unmounted PWA dev/update components
- Fix `revalidatePath('/menu')` → `'/'`
- Remove `NEXT_PUBLIC_MAP_PROVIDER` dead env
- Optional shadcn UI + npm dependency prune (separate approval)
