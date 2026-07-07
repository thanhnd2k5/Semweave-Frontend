import { describe, expect, it } from 'vitest';
import { ApiError } from '@/common/errors/api-error';
import { ErrorCodes } from '@/common/constants/error-codes';
import { isApiEnvelope, unwrapApiResponse } from '@/lib/api-response';

describe('api-response', () => {
  it('unwraps success envelope', () => {
    const data = unwrapApiResponse({
      success: true,
      data: { id: '1', name: 'test' },
    });
    expect(data).toEqual({ id: '1', name: 'test' });
  });

  it('throws ApiError on error envelope', () => {
    expect(() =>
      unwrapApiResponse({
        success: false,
        error: { code: ErrorCodes.NOT_FOUND, message: 'Not found' },
      }),
    ).toThrow(ApiError);
  });

  it('detects API envelope shape', () => {
    expect(isApiEnvelope({ success: true, data: {} })).toBe(true);
    expect(isApiEnvelope({ foo: 'bar' })).toBe(false);
    expect(isApiEnvelope(null)).toBe(false);
  });
});
