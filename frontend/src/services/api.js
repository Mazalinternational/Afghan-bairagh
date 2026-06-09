import axios from 'axios';
import { getAccessToken } from '../utils/tokenStorage';

/** Local `npm start` only — set REACT_APP_API_URL in `.env` (e.g. http://localhost:8000). */
// const DEV_API_FALLBACK = 'http://localhost:8000';

/** Coerce DRF list or paginated payloads into a plain array. */
export function normalizeListPayload(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

/**
 * Deployed API origin for afghanflags.com (no trailing slash, no `/api` suffix).
 * Override with REACT_APP_API_URL at build time (e.g. `https://api.afghanflags.com`).
 */
export const PRODUCTION_API_ORIGIN = 'https://afghanflags.com';

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

export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.REACT_APP_API_URL || PRODUCTION_API_ORIGIN
);

// CRA bakes env at `npm start` / `npm run build` — restart dev server after changing `.env`.
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line no-console
  console.info(
    '[api] API_BASE_URL =',
    API_BASE_URL,
    '| REACT_APP_API_URL =',
    process.env.REACT_APP_API_URL ?? '(unset, using dev fallback or production branch above)'
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
      config.headers['Cache-Control'] = 'no-cache';
      config.headers.Pragma = 'no-cache';
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

// Response interceptor: invalid JWTs still run authentication and return 401 even on AllowAny
// routes. Clear the bad token and retry once without Authorization so public API works.
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
      originalRequest._authRetry = true;
      originalRequest._401RetryUsedTestToken =
        getAccessToken() === 'test-token';
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      if (originalRequest.headers) {
        delete originalRequest.headers.Authorization;
      }
      return api(originalRequest);
    }

    // Only force logout after the unauthenticated retry still returned 401.
    // Previously: `token !== 'test-token'` was true when token was already removed,
    // so the first 401 on protected routes (e.g. blob backup) triggered an immediate redirect to /login.
    if (status === 401 && originalRequest?._authRetry) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      if (!originalRequest._401RetryUsedTestToken) {
        window.location.href = '/login';
      }
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
