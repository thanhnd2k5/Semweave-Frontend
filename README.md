# nextjs-starter-tailwind

**Repo độc lập** — Next.js frontend base với optional auth, API proxy, offline cache stub, i18n (core), và **Tailwind CSS v4**.

> Variant của [`nextjs-starter`](../nextjs-starter) — cùng kiến trúc, khác styling (Tailwind thay CSS Modules).

## Quick start

Requires [pnpm](https://pnpm.io/installation) 10+:

```bash
# Node 24 trở xuống (corepack có sẵn)
corepack enable

# Node 25+ (corepack không còn đi kèm Node)
npm install -g pnpm@10.34.4
```

```bash
cp .env.example .env
pnpm install
pnpm run dev
```

- http://localhost:3000/vi — Home (app info + API health)
- http://localhost:3000/vi/settings — User preferences (protected when `FEATURE_AUTH=true`)
- http://localhost:3000/vi/auth/login — Login (when `FEATURE_AUTH=true`)
- http://localhost:3000/vi/dashboard — Dashboard placeholder

## Core (always on)

- next-intl (`vi` / `en`) — configure via `NEXT_PUBLIC_DEFAULT_LOCALE`
- API client with `{ success, data, error }` envelope
- Tailwind CSS v4 utility classes (`Button`, `Input`, `LoadingSpinner`) — `globals.css` chỉ `@import 'tailwindcss'` + `@custom-variant dark`
- Light / dark theme: toggle trên **header mọi trang** (không cần login) + section Giao diện trong Settings; `html.dark`, `lib/theme-classes.ts`, `localStorage` key `theme`, default dark

## Feature flags

| Module | Env |
|--------|-----|
| Auth | `FEATURE_AUTH=true` + `NEXT_PUBLIC_API_URL` (or API proxy) |
| API proxy | `FEATURE_API_PROXY=true` + `API_PROXY_TARGET` (dev only) |
| Offline cache | `FEATURE_OFFLINE=true` (Dexie stub) |

See [docs/ENABLE_FEATURES.md](./docs/ENABLE_FEATURES.md).

> **Rebuild required** after changing feature flags (`NEXT_PUBLIC_*` baked at build time).

## Full-stack with nestjs-starter

```bash
# Terminal 1 — API on port 3001
cd ../nestjs-starter
PORT=3001 FEATURE_PRISMA=true FEATURE_AUTH=true pnpm run dev

# Terminal 2 — Web on port 3000
cd nextjs-starter-tailwind
FEATURE_AUTH=true NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm run dev
```

Set `CORS_ORIGINS=http://localhost:3000` in nestjs-starter `.env`.

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
