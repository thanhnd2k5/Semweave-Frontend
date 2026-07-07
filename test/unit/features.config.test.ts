import { describe, expect, it } from 'vitest';
import { isAuthEnabled } from '@/config/features.config';

describe('isAuthEnabled', () => {
  it('returns false when both flags are unset', () => {
    expect(isAuthEnabled({})).toBe(false);
    expect(isAuthEnabled({ FEATURE_AUTH: 'false' })).toBe(false);
  });

  it('returns true when FEATURE_AUTH is true', () => {
    expect(isAuthEnabled({ FEATURE_AUTH: 'true' })).toBe(true);
  });

  it('returns true when NEXT_PUBLIC_FEATURE_AUTH is true', () => {
    expect(isAuthEnabled({ NEXT_PUBLIC_FEATURE_AUTH: 'true' })).toBe(true);
  });

  it('returns true when either flag is true', () => {
    expect(
      isAuthEnabled({
        FEATURE_AUTH: 'false',
        NEXT_PUBLIC_FEATURE_AUTH: 'true',
      }),
    ).toBe(true);
  });
});
