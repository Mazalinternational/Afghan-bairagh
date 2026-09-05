import axios from 'axios';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearAuthTokens } from '../utils/tokenStorage';

function isLocalApiUrl(url) {
  return !url || /localhost|127\.0\.0\.1/i.test(url);
}

function resolveApiBaseUrl() {
  const envUrl = (process.env.REACT_APP_API_URL || '').trim();

  // --- PRODUCTION API (active) ---
  return normalizeApiBaseUrl(envUrl || PRODUCTION_API_ORIGIN);

  // --- LOCAL API (commented — uncomment to test against localhost:8000) ---
  // if (process.env.NODE_ENV === 'development' && isLocalApiUrl(envUrl || LOCAL_API_ORIGIN)) {
  //   return '';
  // }
  // return normalizeApiBaseUrl(envUrl || LOCAL_API_ORIGIN);
}

/** Coerce DRF list or paginated payloads into a plain array. */
export function normalizeListPayload(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

/**
 * Production API origin (see frontend/.env.production and DEPLOY-CPANEL-SETUP.md).
 */
export const PRODUCTION_API_ORIGIN = 'https://afghanflags.com';

/** Local Django when developing with npm start + CRA proxy. */
export const LOCAL_API_ORIGIN = 'http://localhost:8000';

/**
 * Backend origin only (no trailing slash, no /api suffix).
 * If REACT_APP_API_URL ends with `/api`, it is stripped so paths stay `/api/...` not `/api/api/...`.
 */
function normalizeApiBaseUrl(raw) {
  let base = (raw || PRODUCTION_API_ORIGIN).trim().replace(/\/+$/, '');
  if (/\/api$/i.test(base)) {
    base = base.replace(/\/api$/i, '');
  }
  return base;
}

export const API_BASE_URL = resolveApiBaseUrl();

// CRA bakes env at `npm start` / `npm run build` — restart dev server after changing `.env`.
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line no-console
  console.info(
    '[api] API_BASE_URL =',
    API_BASE_URL || '(CRA proxy → http://localhost:8000)',
    '| REACT_APP_API_URL =',
    process.env.REACT_APP_API_URL ?? '(unset)'
  );
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach auth token when available
api.interceptors.request.use(
  (config) => {
    const method = (config.method || 'get').toLowerCase();
    if (method === 'get' || method === 'head') {
      delete config.headers['Content-Type'];
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: refresh JWT on 401 before logging out.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (originalRequest?.skipAuthRetry) {
      return Promise.reject(error);
    }

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._authRetry &&
      getAccessToken()
    ) {
      const refresh = getRefreshToken();
      if (refresh) {
        try {
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/api/auth/token/refresh/`,
            { refresh },
            { skipAuthRetry: true }
          );
          const { access, refresh: newRefresh } = refreshResponse.data;
          setAccessToken(access);
          if (newRefresh) {
            setRefreshToken(newRefresh);
          }
          originalRequest._authRetry = true;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          clearAuthTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    if (status === 401 && originalRequest?._authRetry) {
      clearAuthTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

/** Fetch every page of a DRF list endpoint (or a single array response). */
export async function fetchAllListPages(url, { pageSize = 100, maxPages = 50 } = {}) {
  let page = 1;
  let total = Infinity;
  const rows = [];
  while (rows.length < total && page <= maxPages) {
    const sep = url.includes('?') ? '&' : '?';
    const response = await api.get(`${url}${sep}page=${page}&page_size=${pageSize}`);
    const chunk = normalizeListPayload(response.data);
    if (!chunk.length) break;
    total = response.data?.count ?? chunk.length;
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    page += 1;
  }
  return rows;
}

export default api;
