import { ErrorCodes } from '@/common/constants/error-codes';

const AUTH_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
]);

export function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  const path = url.split('?')[0];
  return AUTH_ENDPOINTS.has(path) || [...AUTH_ENDPOINTS].some((ep) => path.endsWith(ep));
}

export function shouldAttemptTokenRefresh(params: {
  status?: number;
  errorCode?: string;
  url?: string;
  alreadyRetried: boolean;
  featureAuth: boolean;
}): boolean {
  return (
    params.status === 401 &&
    params.errorCode !== ErrorCodes.INVALID_CREDENTIALS &&
    params.featureAuth &&
    !params.alreadyRetried &&
    !isAuthEndpoint(params.url)
  );
}
