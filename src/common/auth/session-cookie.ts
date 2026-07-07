export const SESSION_COOKIE = 'auth_session';

/** Client-side routing hint for middleware — NOT a security boundary. */
export function setSessionCookie(): void {
  if (typeof document === 'undefined') {
    return;
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax${secure}`;
}

export function clearSessionCookie(): void {
  if (typeof document === 'undefined') {
    return;
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0${secure}`;
}
