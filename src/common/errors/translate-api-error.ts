import { ErrorCodes } from '@/common/constants/error-codes';

const TRANSLATABLE_ERROR_CODES = new Set<string>([
  ...Object.values(ErrorCodes),
  'UNKNOWN',
]);

export function translateApiError(
  tErrors: (key: string) => string,
  code: string,
  fallback: string,
): string {
  if (TRANSLATABLE_ERROR_CODES.has(code)) {
    return tErrors(code);
  }
  return fallback;
}
