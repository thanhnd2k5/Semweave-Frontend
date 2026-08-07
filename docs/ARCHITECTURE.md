# Architecture

## Layer overview

```
src/
├── config/           # Env validation (Zod), feature flags
├── common/           # API types, errors, route constants, session cookie
├── infrastructure/   # i18n, providers
├── lib/              # API client (Axios), proxy handler, theme-classes, cn
├── stores/           # Zustand stores (auth)
├── features/
│   ├── app/          # Home meta, API health, AppHeader (always on)
│   ├── theme/        # useTheme hook + ThemeToggle (light/dark)
│   └── _optional/    # Auth, offline — toggled via env
└── app/              # Next.js App Router pages
```

## Core (always enabled)

- **Config**: Zod validation at build/dev; fail fast on invalid env
- **API client**: Axios with `{ success, data, error }` envelope unwrap
- **Errors**: `ApiError` with machine-readable `code` (mirrors semweave-api)
- **i18n**: next-intl with `[locale]` routing (`vi`, `en`)
- **State**: TanStack Query for server state; Zustand for auth (when enabled)
- **UI**: Tailwind CSS primitives (`Button`, `Input`, `LoadingSpinner`) + shared `theme.*` classes for light/dark

### Theming

Design tokens & palette: [docs/design.md](../../docs/design.md) §4. Implementation: `src/app/globals.css` + `src/lib/theme-classes.ts`.

- **Tailwind v4 `@theme`** trong `globals.css` — đăng ký màu Semweave thành utilities (`bg-bg-base`, `text-accent`, …). Không phải custom CSS riêng.
- `:root` / `.dark` set `--sem-*` — đổi palette khi toggle theme, không cần `dark:` trên mọi class
- `html.dark` toggled by `ThemeToggle` (default: dark); inline script trước paint — no flash
- **Geist Sans / Mono** via `geist` package in `[locale]/layout.tsx`
- New UI: import `theme` from `lib/theme-classes.ts` — chuỗi class Tailwind semantic; không hardcode `slate-*` / `blue-*`

## Optional modules

Enabled via env flags. See [ENABLE_FEATURES.md](./ENABLE_FEATURES.md).

| Flag | Provides |
|------|----------|
| `FEATURE_AUTH` | Login/register, auth store, middleware guard, refresh flow |
| `FEATURE_API_PROXY` | `/api/*` → NestJS proxy (**dev only**, path allowlist) |
| `FEATURE_OFFLINE` | Dexie IndexedDB stub |

**Core (not a flag):** i18n via next-intl — `NEXT_PUBLIC_DEFAULT_LOCALE` (`vi` | `en`)

## Request flow (with auth)

```
Browser
  → middleware (locale + auth_session routing hint)
  → Page (Server/Client Component)
  → AuthGuard (client — validates access token)
  → api-client (Bearer token + credentials)
  → NestJS API (or /api proxy in dev)
  → TransformInterceptor { success, data }
```

On 401 (except `INVALID_CREDENTIALS`, and never on `/auth/*` endpoints):

```
api-client → authStore.refreshToken() → POST /auth/refresh (cookie)
           → retry original request once
```

## Auth security model

- **access_token**: in-memory only (Zustand) — never localStorage
- **refresh_token**: httpOnly cookie from NestJS
- **auth_session cookie**: client-set **routing hint only** (not HttpOnly, not a security boundary). Middleware uses it to redirect unauthenticated users; `AuthGuard` enforces real auth via API token.
- **AuthGuard**: client-side guard — redirects to login when no valid session

### Production deployment patterns

| Pattern | Setup | Refresh cookie |
|---------|-------|----------------|
| **Same-origin (recommended)** | Vercel rewrites `/api/*` → backend | Cookie on same site — works with `SameSite=Lax` |
| **Cross-origin** | `NEXT_PUBLIC_API_URL=https://api.example.com` | Requires backend `SameSite=None; Secure` + CORS credentials |
| **Dev proxy** | `FEATURE_API_PROXY=true` | Proxy rewrites `Set-Cookie` paths to `/api/auth/*` |

**Rebuild required** after changing feature flags — `NEXT_PUBLIC_*` values are baked at build time via `next.config.ts`.

## Adding domain features

1. Create `src/features/your-feature/`
2. Add pages under `src/app/[locale]/your-feature/`
3. Add routes to `common/constants/routes.ts` (`PUBLIC_ROUTES` / `PROTECTED_ROUTES`)
4. Extend `ErrorCodes` for domain-specific error mapping
5. Extend `PROXY_ALLOWED_PATH_PREFIXES` if using API proxy in dev

## Conventions

| File | Purpose |
|------|---------|
| `common/types/api.types.ts` | API envelope types |
| `common/constants/error-codes.ts` | Error codes (sync with backend) |
| `common/constants/routes.ts` | Route paths + public/protected lists |
| `common/constants/proxy.ts` | API proxy path allowlist |
| `common/auth/session-cookie.ts` | Routing hint cookie helpers |
| `lib/api-client.ts` | HTTP client — extend via hooks, don't fork |
| `lib/api-auth.ts` | Refresh retry rules (testable) |
| `lib/api-response.ts` | API envelope unwrap (testable) |
| `config/env.schema.ts` | Add new env vars here with validation |

## Do not modify (extend instead)

- `lib/api-client.ts` — add domain API functions in `features/*/api.ts`
- `middleware.ts` — add routes via `common/constants/routes.ts`
- `config/env.schema.ts` — add env vars with Zod validation

Domain errors map to user-facing messages via `messages/*.json` `errors` namespace.
