/** Path prefixes allowed through the API proxy (relative to API root). */
export const PROXY_ALLOWED_PATH_PREFIXES = [
  'auth/',
  'users/',
  'health',
] as const;

export function isProxyPathAllowed(targetPath: string): boolean {
  const normalized = targetPath.replace(/^\/+/, '');

  if (normalized === '') {
    return true;
  }

  return PROXY_ALLOWED_PATH_PREFIXES.some(
    (prefix) => normalized === prefix.replace(/\/$/, '') || normalized.startsWith(prefix),
  );
}
