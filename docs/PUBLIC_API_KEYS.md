# Public API Keys — Production Configuration

This app exposes **browser-visible** keys via `NEXT_PUBLIC_*` variables. They are expected to be public but must be **restricted at the provider** to prevent abuse and billing fraud.

Do **not** move these to server-only env vars without a deliberate architecture change — Mapbox/Google Maps load in the client today.

---

## Keys in this project

| Variable                          | Provider     | Used for                                                             |
| --------------------------------- | ------------ | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud | Maps JavaScript API (tracking/checkout when `MAP_PROVIDER=google`)   |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox       | Geocoding + Mapbox GL maps (checkout address, live tracking)         |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase     | API + Realtime (public by design)                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase     | Client auth + RLS-scoped queries (public by design; protect via RLS) |

---

## Staging (zrok — current)

Until final production domain:

| Key         | Allowed domains / referrers                                       |
| ----------- | ----------------------------------------------------------------- |
| Google Maps | `https://nixk-server.shares.zrok.io/*`, `http://localhost:8080/*` |
| Mapbox      | `https://nixk-server.shares.zrok.io`, `http://localhost:8080`     |

Keep `NEXT_PUBLIC_BASE_URL=https://nixk-server.shares.zrok.io` (or your active zrok share name).

---

## Production (final domain)

Replace zrok entries with your production hostname, e.g.:

- `https://order.yourdomain.gr/*`
- `https://www.yourdomain.gr/*` (if applicable)

Remove zrok referrers only **after** migration is complete.

---

## Google Maps — restriction steps

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Select the browser API key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
3. **Application restrictions** → HTTP referrers → add staging + production URLs above
4. **API restrictions** → Restrict key → enable only:
   - Maps JavaScript API
   - (Optional) Geocoding API if used server-side elsewhere
5. Set quotas/alerts under APIs & Services → Dashboard

---

## Mapbox — restriction steps

1. [Mapbox Account](https://account.mapbox.com/) → Access tokens
2. Create a **separate production token** (do not reuse dev token in prod)
3. Enable **URL restrictions**:
   - Staging: `nixk-server.shares.zrok.io`, `localhost`
   - Production: your final domain
4. Limit scopes to what the app uses:
   - `styles:read`, `fonts:read`, `datasets:read` (maps)
   - Geocoding API for address search
5. Rotate token if leaked; update `.env` / deployment secrets

---

## Supabase anon key

The anon key is public by design. Security is enforced by:

- Row Level Security (RLS) policies
- Server-only `SUPABASE_SERVICE_ROLE_KEY` for privileged writes
- Run `bun run verify:migrations` after schema changes

Restrict in Supabase Dashboard → Project Settings → API:

- Site URL / redirect URLs for auth callbacks
- Optional: rate limiting on Supabase plan

---

## Viva webhook IP allowlist (infrastructure)

Viva publishes webhook source IPs (see [Viva webhooks docs](https://developer.viva.com/webhooks-for-payments/)).

**Production IPs (indicative — verify in Viva portal):**

- `51.138.37.238`
- `40.127.253.112/28`
- `51.105.129.192/28`
- `20.54.89.16`
- `4.223.76.50`
- `51.12.157.0/28`

**Demo IPs:**

- `20.50.240.57`, `40.74.20.78`, `195.167.87.181`, `195.167.87.180`, `20.13.195.185`, `135.225.16.50`

### App-level (optional)

Set exact IPs only (no CIDR parsing in app):

```env
VIVA_WEBHOOK_IP_ALLOWLIST=51.138.37.238,20.54.89.16
```

When set, production webhook POSTs from other IPs return `403`.

### Recommended (firewall / CDN)

Enforce full CIDR ranges at **Cloudflare, nginx, or hosting firewall** — more reliable than app-level exact-IP matching.

---

## Checklist before go-live

- [ ] Google Maps key restricted to production + staging referrers
- [ ] Mapbox token URL-restricted and scoped
- [ ] Supabase Site URL + redirect URLs updated for production domain
- [ ] Viva webhook URL registered to production `/api/viva/webhook`
- [ ] Viva webhook IPs allowlisted at firewall/CDN
- [ ] `VIVA_WEBHOOK_KEY` set in production env
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` set for multi-instance webhook rate limiting
- [ ] Remove dev/zrok referrers after cutover (optional hardening)
