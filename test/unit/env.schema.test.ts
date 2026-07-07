import { describe, expect, it } from 'vitest';
import { envSchema, getFeatureFlags } from '@/config/env.schema';

describe('envSchema', () => {
  it('parses core defaults', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'test',
      APP_NAME: 'test-app',
      APP_VERSION: '2.0.0',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.APP_NAME).toBe('test-app');
      expect(result.data.FEATURE_AUTH).toBe(false);
      expect(result.data.NEXT_PUBLIC_DEFAULT_LOCALE).toBe('vi');
    }
  });

  it('requires NEXT_PUBLIC_API_URL when FEATURE_AUTH=true without proxy', () => {
    const result = envSchema.safeParse({
      FEATURE_AUTH: 'true',
    });

    expect(result.success).toBe(false);
  });

  it('allows FEATURE_AUTH with FEATURE_API_PROXY', () => {
    const result = envSchema.safeParse({
      FEATURE_AUTH: 'true',
      FEATURE_API_PROXY: 'true',
      API_PROXY_TARGET: 'http://localhost:3001',
    });

    expect(result.success).toBe(true);
  });

  it('requires API_PROXY_TARGET when FEATURE_API_PROXY=true', () => {
    const result = envSchema.safeParse({
      FEATURE_API_PROXY: 'true',
    });

    expect(result.success).toBe(false);
  });

  it('returns feature flags', () => {
    const env = envSchema.parse({
      FEATURE_AUTH: 'true',
      NEXT_PUBLIC_API_URL: 'http://localhost:3001',
      FEATURE_OFFLINE: 'true',
    });

    expect(getFeatureFlags(env)).toEqual({
      auth: true,
      apiProxy: false,
      offline: true,
    });
  });
});
