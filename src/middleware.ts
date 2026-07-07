import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/common/auth/session-cookie';
import {
  isProtectedRoute,
  isPublicRoute,
  stripLocalePrefix,
} from '@/common/constants/routes';
import { isAuthEnabled } from '@/config/features.config';
import { routing } from '@/infrastructure/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);

  if (!isAuthEnabled()) {
    return intlResponse;
  }

  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale = stripLocalePrefix(pathname, [...routing.locales]);

  if (isPublicRoute(pathWithoutLocale)) {
    return intlResponse;
  }

  if (isProtectedRoute(pathWithoutLocale)) {
    // Routing hint only — real auth is enforced client-side via AuthGuard + API.
    if (!request.cookies.has(SESSION_COOKIE)) {
      const locale = pathname.split('/')[1] || routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/auth/login`, request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ['/', '/(vi|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
