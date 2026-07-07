import { ErrorCodes, type ErrorCode } from '@/common/constants/error-codes';
import type { ApiErrorBody } from '@/common/types/api.types';

export class ApiError extends Error {
  readonly code: ErrorCode | string;
  readonly details?: Record<string, unknown>;
  readonly status?: number;

  constructor(error: ApiErrorBody, status?: number) {
    super(error.message);
    this.name = 'ApiError';
    this.code = error.code;
    this.details = error.details;
    this.status = status;
  }

  static fromUnknown(error: unknown, status?: number): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error
    ) {
      return new ApiError(error as ApiErrorBody, status);
    }

    return new ApiError(
      {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Something went wrong',
      },
      status,
    );
  }
}
