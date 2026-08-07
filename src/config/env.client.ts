/**
 * Client-safe env values (NEXT_PUBLIC_* only).
 * Populated at build time via next.config.ts from server env.
 */
export const clientEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Semweave',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
  defaultLocale: (process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'vi') as 'vi' | 'en',
  featureAuth: process.env.NEXT_PUBLIC_FEATURE_AUTH === 'true',
  featureApiProxy: process.env.NEXT_PUBLIC_FEATURE_API_PROXY === 'true',
  featureOffline: process.env.NEXT_PUBLIC_FEATURE_OFFLINE === 'true',
} as const;
