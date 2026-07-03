# Juco Cafe — Online Ordering System

Full-stack café ordering platform (Next.js 15, Supabase, Viva Wallet, Mapbox).

## Features

### Customers

- Menu browsing, search, cart
- Guest checkout (pickup COD, delivery, card via Viva)
- Account: profile, addresses, order history, favorite orders
- Real-time order tracking (`/track/[orderId]`)

### Operations

- **Admin** (`/admin`) — menu, orders, drivers, kitchen workflow
- **Driver** (`/driver`) — accept, pickup, deliver
- **SuperAdmin** (`/superadmin`) — optional platform console (`NEXT_PUBLIC_SUPERADMIN_ENABLED=true`)

## Quick start

```bash
bun install
cp .env.example .env.local   # fill in values
bun run dev                  # http://localhost:8080
```

Public staging tunnel (optional):

```bash
bun run tunnel
```

## Environment variables

Copy [`.env.example`](./.env.example) to `.env.local`. Required variables are validated at server startup via `src/lib/server/env.ts` (`ENV_MANIFEST`).

**Always required:** `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`

**Production only:** `SESSION_SECRET`, `VIVA_*` (see `.env.example`)

See also [docs/PRODUCTION_RUNBOOK.md](./docs/PRODUCTION_RUNBOOK.md) and [docs/PUBLIC_API_KEYS.md](./docs/PUBLIC_API_KEYS.md).

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Development server (port 8080) |
| `bun run build` | Production build |
| `bun run start` | Production server (port 8080) |
| `bun run typecheck` | TypeScript check |
| `bun run test` | Unit tests (Vitest) |
| `bun run test:e2e` | Playwright E2E (builds first, port 8092) |
| `bun run test:e2e:live` | E2E against real Supabase (`E2E_LIVE=1`) |
| `bun run lint` | ESLint |
| `bun run verify:migrations` | Post-migration security checks |
| `bun run tunnel` | zrok public tunnel for staging |

## Documentation

- [Production runbook](./docs/PRODUCTION_RUNBOOK.md)
- [Deployment verification checklist](./docs/DEPLOYMENT_VERIFICATION.md)
- [API key restrictions](./docs/PUBLIC_API_KEYS.md)

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Supabase · Tailwind CSS 4 · Viva Wallet · Mapbox · Bun
