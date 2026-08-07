# Enable Features

Optional modules are toggled via environment variables in `.env` (or `.env.local`).

> **Note:** `NEXT_PUBLIC_*` flags are baked at **build time**. Run `pnpm run build` again after changing env.

## Auth (`FEATURE_AUTH`)

Requires `semweave-api` with auth enabled.

```bash
FEATURE_AUTH=true
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Or with API proxy (dev):

```bash
FEATURE_AUTH=true
FEATURE_API_PROXY=true
API_PROXY_TARGET=http://localhost:3001
```

**Backend (`semweave-api`) must also have:**

```bash
PORT=3001
FEATURE_PRISMA=true
FEATURE_AUTH=true
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...   # min 32 chars
JWT_REFRESH_SECRET=...  # min 32 chars
CORS_ORIGINS=http://localhost:3000
```

**Provides:**

- `POST /auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`
- `GET /users/me`, `PATCH /users/settings`
- Pages: `/vi/auth/login`, `/vi/auth/register`
- Protected: `/dashboard`, `/settings` (theme, language, learning prefs — **no API key**)
- Zustand `auth-store` with in-memory access token
- `auth_session` cookie (routing hint for middleware after login)

**Auth flow:**

1. Login → access token in response body, refresh in httpOnly cookie
2. API calls use `Authorization: Bearer <token>`
3. On 401 → auto refresh via cookie → retry request (never retries `/auth/*` calls)

## API proxy (`FEATURE_API_PROXY`)

**Development only** — blocked in `NODE_ENV=production`.

Proxies browser requests from `/api/*` to NestJS — useful when CORS is problematic in local dev.

```bash
FEATURE_API_PROXY=true
API_PROXY_TARGET=http://localhost:3001
```

When proxy is enabled, `api-client` uses base URL `/api`.

**Security:**

- Path allowlist: `auth/*`, `users/*`, `health`, `/` only
- Extend `common/constants/proxy.ts` for new domain routes
- `Set-Cookie` paths rewritten from `/auth/` → `/api/auth/` for refresh to work

**Production:** use Vercel/nginx reverse proxy instead of this feature.

## Offline cache (`FEATURE_OFFLINE`)

```bash
FEATURE_OFFLINE=true
```

**Provides:**

- Dexie IndexedDB stub (`local-db.ts`, DB name `SemweaveLocal`)
- `OfflineProvider` in app providers
- Tables: `pendingAttempts`, `cachedQuizPools` (placeholder for quiz sync)

## i18n (core)

Always enabled. Configure default locale:

```bash
NEXT_PUBLIC_DEFAULT_LOCALE=vi
```

Locales: `vi` (default), `en`. All user-facing routes live under `/[locale]/`.

## Full-stack example (direct API)

```bash
# Semweave-Backend/.env
PORT=3001
FEATURE_PRISMA=true
FEATURE_AUTH=true
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/semweave
JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars
JWT_REFRESH_SECRET=change-me-refresh-secret-min-32-chars
ENCRYPTION_SECRET=change-me-encryption-secret-32chars
CORS_ORIGINS=http://localhost:3000

# Semweave-Frontend/.env
FEATURE_AUTH=true
NEXT_PUBLIC_API_URL=http://localhost:3001
APP_NAME=Semweave
```

```bash
# Terminal 1
cd Semweave-Backend && pnpm run dev

# Terminal 2
cd Semweave-Frontend && pnpm run dev
```

Open http://localhost:3000/vi/auth/register to create an account.

## Full-stack example (dev proxy — no CORS)

```bash
# Semweave-Frontend/.env
FEATURE_AUTH=true
FEATURE_API_PROXY=true
API_PROXY_TARGET=http://localhost:3001
```

```bash
cd Semweave-Backend && pnpm run dev
cd Semweave-Frontend && pnpm run dev
```
