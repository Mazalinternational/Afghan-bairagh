/**
 * Login stores JWTs in localStorage; if "Remember me" is off, tokens are moved to sessionStorage only.
 * All API/auth code must read access/refresh from either store.
 */
export function getAccessToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
}

export function clearAuthTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refreshToken');
}

/** Persist new access token beside refresh (same storage bucket). */
export function setAccessToken(access) {
  if (sessionStorage.getItem('refreshToken')) {
    sessionStorage.setItem('token', access);
    return;
  }
  localStorage.setItem('token', access);
}
