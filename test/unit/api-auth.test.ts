import { describe, expect, it } from 'vitest';
import { ErrorCodes } from '@/common/constants/error-codes';
import { isAuthEndpoint, shouldAttemptTokenRefresh } from '@/lib/api-auth';
import { rewriteSetCookiePath } from '@/lib/proxy-handler';
import { isProxyPathAllowed } from '@/common/constants/proxy';

describe('api-auth', () => {
  it('detects auth endpoints', () => {
    expect(isAuthEndpoint('/auth/login')).toBe(true);
    expect(isAuthEndpoint('/auth/refresh')).toBe(true);
    expect(isAuthEndpoint('/users/me')).toBe(false);
    expect(isAuthEndpoint('/api/auth/refresh')).toBe(true);
  });

  it('skips refresh retry for auth endpoints', () => {
    expect(
      shouldAttemptTokenRefresh({
        status: 401,
        errorCode: ErrorCodes.UNAUTHORIZED,
        url: '/auth/refresh',
        alreadyRetried: false,
        featureAuth: true,
      }),
    ).toBe(false);
  });

  it('allows refresh retry for protected API calls', () => {
    expect(
      shouldAttemptTokenRefresh({
        status: 401,
        errorCode: ErrorCodes.UNAUTHORIZED,
        url: '/users/me',
        alreadyRetried: false,
        featureAuth: true,
      }),
    ).toBe(true);
  });

  it('does not retry invalid credentials', () => {
    expect(
      shouldAttemptTokenRefresh({
        status: 401,
        errorCode: ErrorCodes.INVALID_CREDENTIALS,
        url: '/users/me',
        alreadyRetried: false,
        featureAuth: true,
      }),
    ).toBe(false);
  });
});

describe('proxy', () => {
  it('allows known path prefixes', () => {
    expect(isProxyPathAllowed('auth/login')).toBe(true);
    expect(isProxyPathAllowed('users/me')).toBe(true);
    expect(isProxyPathAllowed('health')).toBe(true);
    expect(isProxyPathAllowed('')).toBe(true);
    expect(isProxyPathAllowed('admin/secret')).toBe(false);
  });

  it('rewrites Set-Cookie path for proxy mode', () => {
    const cookie =
      'refresh_token=abc; Path=/auth/refresh; HttpOnly; SameSite=Lax';
    expect(rewriteSetCookiePath(cookie)).toContain('Path=/api/auth/refresh');
  });
});
