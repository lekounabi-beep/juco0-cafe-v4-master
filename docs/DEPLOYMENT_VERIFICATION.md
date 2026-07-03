# Deployment Verification Checklist

Use this checklist **before and after** every production deploy.

---

## Pre-deploy

### Build & CI

- [ ] GitHub Actions CI green on target commit (`typecheck`, `test`, `build`, `e2e`)
- [ ] Local `bun run build` succeeds with production env vars

### Database migrations

- [ ] All pending migrations applied to production Supabase (see [PRODUCTION_RUNBOOK.md](./PRODUCTION_RUNBOOK.md#migration-order))
- [ ] `bun run verify:migrations` passes against production Supabase (12/12 checks)

### Environment variables

- [ ] All **required** vars from `.env.example` set in hosting platform
- [ ] `SESSION_SECRET` is unique and ≥ 32 characters
- [ ] `VIVA_WEBHOOK_KEY` matches Viva dashboard
- [ ] `UPSTASH_REDIS_REST_*` set if running **multi-instance** (recommended)
- [ ] No secrets committed to git

### Viva webhook

- [ ] Webhook URL registered: `https://<your-host>/api/viva/webhook`
- [ ] GET verification returns `{ "Key": "..." }` (Viva dashboard verify succeeded)
- [ ] Viva source IPs allowlisted at firewall/CDN (see [PUBLIC_API_KEYS.md](./PUBLIC_API_KEYS.md))

### API keys (provider dashboards)

- [ ] Google Maps key restricted to allowed referrers
- [ ] Mapbox token URL-restricted
- [ ] Supabase auth redirect URLs configured

---

## Post-deploy smoke checks

### Health endpoint

```bash
curl -s https://<your-host>/api/health
```

Expected:

```json
{
  "status": "ok",
  "timestamp": "...",
  "version": "1.0.0",
  "environment": "production"
}
```

- [ ] Returns HTTP 200
- [ ] `status` is `"ok"`
- [ ] Response contains **no secrets**

### Core flows (manual)

- [ ] Homepage loads (`/`)
- [ ] Guest checkout COD completes (test order)
- [ ] Card checkout redirects to Viva (demo/sandbox if applicable)
- [ ] Admin login works (`/admin/login`)
- [ ] Driver login works (`/driver/login`)
- [ ] Order tracking page loads for a recent order (`/track/<orderId>`)

### Webhook (card payments)

- [ ] Complete a sandbox card payment end-to-end
- [ ] Order marked `paid` even if browser tab closed before `/order-success`
- [ ] Server logs show `payment.webhook.order_created` (no errors)

### Security spot-check

- [ ] `curl -I https://<your-host>/` includes security headers (HSTS, X-Frame-Options, etc.)
- [ ] Unauthenticated request to `/admin` redirects to login
- [ ] Anon cannot read orders via Supabase REST (verified by `verify:migrations`)

---

## Rollback trigger

Rollback if any of:

- Health endpoint non-200 for > 2 minutes
- Payment webhook errors spike
- Orders cannot be created (COD or card)
- `verify:migrations` fails after deploy

See [PRODUCTION_RUNBOOK.md](./PRODUCTION_RUNBOOK.md#rollback-procedure).
