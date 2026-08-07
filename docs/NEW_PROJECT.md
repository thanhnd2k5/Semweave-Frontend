# New Project Checklist

Use when setting up `semweave-web` for Semweave (or cloning as a new frontend project).

## 1. Clone and rename

```bash
git clone <semweave-web-url> my-web
cd my-web
```

Update in `.env` and `package.json`:

- `APP_NAME`
- `APP_VERSION`

## 2. Choose features

Copy `.env.example` → `.env` and enable needed optional modules.

## 3. Connect backend

- [ ] Set `NEXT_PUBLIC_API_URL` to your NestJS API URL
- [ ] If using auth: enable `FEATURE_AUTH` on both frontend and backend
- [ ] Configure backend `CORS_ORIGINS` to include your frontend URL
- [ ] For local dev without CORS issues: consider `FEATURE_API_PROXY=true`

## 4. Add domain features

```
src/features/
├── your-feature/
│   ├── components/
│   ├── hooks/
│   └── api.ts
└── ...

src/app/[locale]/
└── your-feature/
    └── page.tsx
```

Import feature components in pages; add API functions that call `api` from `lib/api-client.ts`.

## 5. Extend routes

Update `src/common/constants/routes.ts`:

```typescript
export const ROUTES = {
  // ...existing
  yourFeature: '/your-feature',
};

export const PROTECTED_ROUTES = [
  // ...existing
  ROUTES.yourFeature,
];
```

## 6. Extend i18n

Add strings to `src/messages/vi.json` and `src/messages/en.json`.

## 7. Production deploy (Vercel)

- [ ] Set `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`
- [ ] Set `FEATURE_AUTH=true` if using authentication
- [ ] Set `NODE_ENV=production`
- [ ] Verify build: `pnpm run validate`
- [ ] Deploy; confirm `/vi` loads and API health check works

## Do not modify (extend instead)

- `lib/api-client.ts`
- `middleware.ts` (extend via `routes.ts`)
- `config/env.schema.ts` — add new env vars here with validation

Map domain API errors to UI messages in `messages/*.json` under `errors`.
