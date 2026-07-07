import { describe, expect, it } from 'vitest';
import { ApiError } from '@/common/errors/api-error';
import { ErrorCodes } from '@/common/constants/error-codes';

describe('ApiError', () => {
  it('creates from error body', () => {
    const error = new ApiError({
      code: ErrorCodes.INVALID_CREDENTIALS,
      message: 'Invalid credentials',
    });

    expect(error.code).toBe(ErrorCodes.INVALID_CREDENTIALS);
    expect(error.message).toBe('Invalid credentials');
  });

  it('fromUnknown wraps unknown errors', () => {
    const error = ApiError.fromUnknown(new Error('boom'), 500);
    expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
    expect(error.status).toBe(500);
  });

  it('fromUnknown returns ApiError unchanged', () => {
    const original = new ApiError({
      code: ErrorCodes.NOT_FOUND,
      message: 'Not found',
    });
    expect(ApiError.fromUnknown(original)).toBe(original);
  });
});
