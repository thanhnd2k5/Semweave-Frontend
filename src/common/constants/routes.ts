/** Route paths without locale prefix (e.g. /dashboard not /vi/dashboard) */
export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  settings: '/settings',
  login: '/auth/login',
  register: '/auth/register',
} as const;

/** Accessible without authentication when FEATURE_AUTH=true */
export const PUBLIC_ROUTES: string[] = [
  ROUTES.home,
  ROUTES.login,
  ROUTES.register,
];

/** Require authentication when FEATURE_AUTH=true */
export const PROTECTED_ROUTES: string[] = [ROUTES.dashboard, ROUTES.settings];

const SAFE_INTERNAL_PATH = /^\/[a-zA-Z0-9/_-]*$/;

export function stripLocalePrefix(pathname: string, locales: string[]): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0])) {
    return '/' + segments.slice(1).join('/');
  }
  return pathname || '/';
}

export function isPublicRoute(pathWithoutLocale: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) =>
      pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`),
  );
}

export function isProtectedRoute(pathWithoutLocale: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) =>
      pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`),
  );
}

/** Validates middleware/login redirect targets — internal paths only. */
export function isSafePostLoginPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    return false;
  }

  if (!SAFE_INTERNAL_PATH.test(path)) {
    return false;
  }

  return isProtectedRoute(path) || path === ROUTES.dashboard;
}

/** Resolve post-login redirect from middleware `?from=` param (may include locale prefix). */
export function resolvePostLoginPath(
  from: string | null,
  locales: readonly string[],
  fallback: string = ROUTES.dashboard,
): string {
  if (!from || from.includes('//')) {
    return fallback;
  }

  const withoutLocale = stripLocalePrefix(from, [...locales]);

  if (!withoutLocale || withoutLocale === '/' || !isSafePostLoginPath(withoutLocale)) {
    return fallback;
  }

  return withoutLocale;
}
