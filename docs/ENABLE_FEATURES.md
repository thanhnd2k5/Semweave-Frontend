# Enable Features

Optional modules are toggled via environment variables in `.env` (or `.env.local`).

> **Note:** `NEXT_PUBLIC_*` flags are baked at **build time**. Run `pnpm run build` again after changing env.

## Auth (`FEATURE_AUTH`)

Requires a NestJS backend with auth enabled (see `nestjs-starter`).

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

**Backend (nestjs-starter) must also have:**

```bash
FEATURE_PRISMA=true
FEATURE_AUTH=true
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...   # min 32 chars
JWT_REFRESH_SECRET=...  # min 32 chars
CORS_ORIGINS=http://localhost:3000
```

**Provides:**

- `POST /auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`
- `GET /users/me`
- Pages: `/vi/auth/login`, `/vi/auth/register`
- Protected: `/dashboard`, `/settings`
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

- Dexie IndexedDB stub (`local-db.ts`)
- `OfflineProvider` in app providers
- Tables: `pendingAttempts`, `cachedQuizPools` (placeholder for LearnVocab quiz sync)

## i18n (core)

Always enabled. Configure default locale:

```bash
NEXT_PUBLIC_DEFAULT_LOCALE=vi
```

Locales: `vi` (default), `en`. All user-facing routes live under `/[locale]/`.

## Full-stack example (direct API)

```bash
# nestjs-starter/.env
PORT=3001
FEATURE_PRISMA=true
FEATURE_AUTH=true
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nestjs_starter
JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars
JWT_REFRESH_SECRET=change-me-refresh-secret-min-32-chars
ENCRYPTION_SECRET=change-me-encryption-secret-32chars
CORS_ORIGINS=http://localhost:3000

# nextjs-starter-tailwind/.env
FEATURE_AUTH=true
NEXT_PUBLIC_API_URL=http://localhost:3001
```

```bash
# Terminal 1
cd nestjs-starter && pnpm run dev

# Terminal 2
cd nextjs-starter-tailwind && pnpm run dev
```

Open http://localhost:3000/vi/auth/register to create an account.

## Full-stack example (dev proxy — no CORS)

```bash
# nextjs-starter-tailwind/.env
FEATURE_AUTH=true
FEATURE_API_PROXY=true
API_PROXY_TARGET=http://localhost:3001
```

```bash
cd nestjs-starter && PORT=3001 pnpm run dev
cd nextjs-starter-tailwind && pnpm run dev
```
