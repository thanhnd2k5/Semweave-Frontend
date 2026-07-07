import { ApiError } from '@/common/errors/api-error';
import type { ApiResponse } from '@/common/types/api.types';

export function unwrapApiResponse<T>(payload: ApiResponse<T>): T {
  if (payload.success) {
    return payload.data;
  }
  throw new ApiError(payload.error);
}

export function isApiEnvelope(value: unknown): value is ApiResponse<unknown> {
  return typeof value === 'object' && value !== null && 'success' in value;
}
