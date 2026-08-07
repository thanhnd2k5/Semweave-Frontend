# semweave-web

**Repo độc lập** — Next.js frontend cho Semweave (Tailwind CSS v4, next-intl, optional auth).

Workspace: xem [README gốc](../README.md) và [docs/STATUS.md](../docs/STATUS.md).

## Quick start

Requires [pnpm](https://pnpm.io/installation) 10+ và Node 20 (`.nvmrc` ở workspace root).

```bash
corepack enable
cp .env.example .env
pnpm install
pnpm run dev
```

- http://localhost:3000/vi — Home
- http://localhost:3000/vi/settings — User preferences (protected when `FEATURE_AUTH=true`)
- http://localhost:3000/vi/auth/login — Login (when `FEATURE_AUTH=true`)
- http://localhost:3000/vi/dashboard — Dashboard placeholder

## Core (always on)

- next-intl (`vi` / `en`) — configure via `NEXT_PUBLIC_DEFAULT_LOCALE`
- API client with `{ success, data, error }` envelope
- Tailwind CSS v4 + Semweave semantic tokens (`theme-classes.ts`)
- Light / dark theme: toggle trên header + Settings

## Feature flags

| Module | Env |
|--------|-----|
| Auth | `FEATURE_AUTH=true` + `NEXT_PUBLIC_API_URL` (or API proxy) |
| API proxy | `FEATURE_API_PROXY=true` + `API_PROXY_TARGET` (dev only) |
| Offline cache | `FEATURE_OFFLINE=true` (Dexie stub) |

See [docs/ENABLE_FEATURES.md](./docs/ENABLE_FEATURES.md).

> **Rebuild required** after changing feature flags (`NEXT_PUBLIC_*` baked at build time).

## Full-stack with semweave-api

```bash
# Terminal 1 — API on port 3001
cd ../Semweave-Backend
pnpm run dev

# Terminal 2 — Web on port 3000
cd ../Semweave-Frontend
pnpm run dev
```

Set `CORS_ORIGINS=http://localhost:3000` and `PORT=3001` in semweave-api `.env`.

## Scripts

| Script | Purpose |
|--------|---------|
| `dev` | Next.js dev server |
| `build` / `start` | Production build / serve |
| `lint` | ESLint |
| `test` | Vitest unit tests |
| `test:e2e` | Playwright E2E |
| `validate` | lint + unit + build + e2e |

## Docs

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [ENABLE_FEATURES.md](./docs/ENABLE_FEATURES.md)
- [NEW_PROJECT.md](./docs/NEW_PROJECT.md)
