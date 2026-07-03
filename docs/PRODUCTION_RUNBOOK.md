# Production Runbook — Juco Cafe

Operations guide for deploying and maintaining the production environment.

---

## Prerequisites

- Hosting with Node.js 20+ (or Bun runtime) support
- Supabase project (production)
- Viva Wallet production account
- Environment variables from `.env.example`
- (Recommended) Upstash Redis for multi-instance webhook rate limiting

---

## Deploy sequence

### 1. Prepare release

```bash
git checkout main
git pull
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run build
```

Confirm CI is green on GitHub Actions.

### 2. Apply database migrations

Apply migrations **in filename order** on production Supabase:

| Order | Migration file                                            |
| ----: | --------------------------------------------------------- |
|     1 | `20260602131956_15db5a5e-8b7e-48fa-bc71-77b14c4267e7.sql` |
|     2 | `20260602132524_d0fa0d44-b2da-47d2-a51f-4b86ba2a9ef9.sql` |
|     3 | `20260616100000_create_products_table.sql`                |
|     4 | `20260619000000_create_delivery_tables.sql`               |
|     5 | `20260619000001_delivery_rls_policies.sql`                |
|     6 | `20260621111900_allow_drivers_insert_assignments.sql`     |
|     7 | `20260621120000_add_coords_to_orders.sql`                 |
|     8 | `20260623000000_production_security_hardening.sql`        |
|     9 | `20260624000000_driver_login_credentials.sql`             |
|    10 | `20260625000000_driver_device_gps_insert.sql`             |
|    11 | `20260625100000_driver_gps_security_definer.sql`          |
|    12 | `20260625200000_delivery_locations_realtime.sql`          |
|    13 | `20260626000000_gps_history_and_monotonic.sql`            |
|    14 | `20260627000000_atomic_transition_and_realtime.sql`       |
|    15 | `20260628000000_status_synchronization_refactor.sql`      |
|    16 | `20260629000000_accept_delivery_atomic_concurrency.sql`   |
|    17 | `20260630000000_phase1_security_integrity.sql`            |
|    18 | `20260631000000_phase1_5_security_closure.sql`            |
|    19 | `20260701000000_close_anon_orders_pii.sql`                |
|    20 | `20260701000000_favorite_orders_rls_fix.sql`              |
|    21 | `20260701000001_close_anon_delivery_assignments.sql`      |

**CLI (recommended):**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Verify:**

```bash
bun run verify:migrations
```

Requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in env.

### 3. Configure environment

Set all variables on the hosting platform (never commit real values).

#### Required (all environments)

| Variable                        | Notes                |
| ------------------------------- | -------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-only secret   |
| `ADMIN_USERNAME`                | Kitchen admin login  |
| `ADMIN_PASSWORD`                | Strong password      |

#### Required (production only)

| Variable             | Notes                              |
| -------------------- | ---------------------------------- |
| `SESSION_SECRET`     | Random ≥ 32 chars                  |
| `VIVA_CLIENT_ID`     | Viva OAuth                         |
| `VIVA_CLIENT_SECRET` | Viva OAuth                         |
| `VIVA_SOURCE_CODE`   | Payment source                     |
| `VIVA_WEBHOOK_KEY`   | From Viva Retrieve Webhook Key API |

#### Staging (current — zrok)

Keep until final domain cutover:

```
NEXT_PUBLIC_BASE_URL=https://nixk-server.shares.zrok.io
```

#### Recommended (multi-instance production)

| Variable                   | Notes                      |
| -------------------------- | -------------------------- |
| `UPSTASH_REDIS_REST_URL`   | Shared webhook rate limits |
| `UPSTASH_REDIS_REST_TOKEN` | Pair with URL above        |

#### Optional

See full list in `.env.example` and `src/lib/server/env.ts` (`ENV_MANIFEST`).

### 4. Register Viva webhook

1. Viva dashboard → Settings → API Access → Webhooks
2. URL: `https://<your-host>/api/viva/webhook`
3. Event: **Transaction Payment Created**
4. Click **Verify** (GET must return `{ "Key": "<VIVA_WEBHOOK_KEY>" }`)
5. Activate webhook

### 5. Deploy application

Build command:

```bash
bun run build
```

Start command:

```bash
bun run start
# listens on port 8080 — map to 80/443 at reverse proxy
```

Or use your platform's Next.js preset if available.

### 6. Post-deploy verification

Follow [DEPLOYMENT_VERIFICATION.md](./DEPLOYMENT_VERIFICATION.md) in full.

Minimum:

```bash
curl -s https://<your-host>/api/health
```

---

## Rollback procedure

### Application rollback

1. Redeploy **previous known-good** git commit/tag from hosting dashboard or CI artifact
2. Do **not** change env vars unless the rollback commit requires it
3. Verify `/api/health` returns 200
4. Run smoke checks from [DEPLOYMENT_VERIFICATION.md](./DEPLOYMENT_VERIFICATION.md)

### Database rollback

**Prefer forward-fix migrations over destructive rollback.**

If a migration caused issues:

1. Stop taking new orders (maintenance mode message if available)
2. Assess whether a **new** corrective migration can fix forward
3. If restore required: restore Supabase from point-in-time backup (Supabase dashboard → Database → Backups)
4. Re-apply migrations only after DBA review

Never run `supabase db reset` on production.

### Payment safety during rollback

- Card orders in-flight may complete via Viva webhook — webhook handler is idempotent
- Monitor logs for `payment.webhook.*` events during rollback window

---

## Monitoring (Phase 4 placeholder)

Monitoring stubs live in `src/lib/server/monitoring.server.ts`:

- `initMonitoring()` — called from `instrumentation.ts` on server start
- `captureException()` / `captureMessage()` — no-op in production until Sentry is wired

To add Sentry later:

1. `bun add @sentry/nextjs`
2. Set `SENTRY_DSN` and `SENTRY_ENVIRONMENT` in production env
3. Implement `Sentry.init` inside `initMonitoring()`
4. Replace stub bodies in `captureException` / `captureMessage`

---

## Useful commands

| Command                     | Purpose                             |
| --------------------------- | ----------------------------------- |
| `bun run typecheck`         | TypeScript validation               |
| `bun run test`              | Unit tests                          |
| `bun run build`             | Production build                    |
| `bun run start`             | Start production server (port 8080) |
| `bun run verify:migrations` | Security migration smoke tests      |

---

## Support references

- [DEPLOYMENT_VERIFICATION.md](./DEPLOYMENT_VERIFICATION.md) — pre/post deploy checklist
- [PUBLIC_API_KEYS.md](./PUBLIC_API_KEYS.md) — API key restrictions
- [.env.example](../.env.example) — environment template
- [SECURITY_CLOSURE_REPORT.md](../SECURITY_CLOSURE_REPORT.md) — security migration context
