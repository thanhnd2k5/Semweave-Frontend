import { describe, expect, it } from 'vitest';
import {
  isProtectedRoute,
  isPublicRoute,
  isSafePostLoginPath,
  resolvePostLoginPath,
  stripLocalePrefix,
} from '@/common/constants/routes';

describe('routes', () => {
  it('strips locale prefix', () => {
    expect(stripLocalePrefix('/vi/dashboard', ['vi', 'en'])).toBe('/dashboard');
    expect(stripLocalePrefix('/en/auth/login', ['vi', 'en'])).toBe('/auth/login');
  });

  it('identifies public routes', () => {
    expect(isPublicRoute('/')).toBe(true);
    expect(isPublicRoute('/auth/login')).toBe(true);
    expect(isPublicRoute('/dashboard')).toBe(false);
  });

  it('identifies protected routes', () => {
    expect(isProtectedRoute('/dashboard')).toBe(true);
    expect(isProtectedRoute('/settings')).toBe(true);
    expect(isProtectedRoute('/auth/login')).toBe(false);
  });
});

describe('isSafePostLoginPath', () => {
  it('allows protected routes', () => {
    expect(isSafePostLoginPath('/dashboard')).toBe(true);
    expect(isSafePostLoginPath('/settings')).toBe(true);
  });

  it('rejects external and malformed paths', () => {
    expect(isSafePostLoginPath('//evil.com')).toBe(false);
    expect(isSafePostLoginPath('/auth/login')).toBe(false);
    expect(isSafePostLoginPath('/../../../etc/passwd')).toBe(false);
  });
});

describe('resolvePostLoginPath', () => {
  it('uses fallback when from is empty', () => {
    expect(resolvePostLoginPath(null, ['vi', 'en'])).toBe('/dashboard');
  });

  it('strips locale from from param', () => {
    expect(resolvePostLoginPath('/vi/dashboard', ['vi', 'en'])).toBe('/dashboard');
  });

  it('rejects open redirect attempts', () => {
    expect(resolvePostLoginPath('//evil.com', ['vi', 'en'])).toBe('/dashboard');
    expect(resolvePostLoginPath('/vi//evil.com', ['vi', 'en'])).toBe('/dashboard');
    expect(resolvePostLoginPath('/vi/auth/login', ['vi', 'en'])).toBe('/dashboard');
  });
});
