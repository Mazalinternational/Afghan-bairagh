import axios from 'axios';
import { getAccessToken } from '../utils/tokenStorage';

/**
 * Backend origin only (no trailing slash, no /api suffix).
 * If REACT_APP_API_URL is set to http://host/api, requests like /api/auth/... would become /api/api/auth/... (404).
 */
function normalizeApiBaseUrl(raw) {
  let base = (raw || 'http://localhost:8000').trim().replace(/\/+$/, '');
  if (/\/api$/i.test(base)) {
    base = base.replace(/\/api$/i, '');
  }
  return base;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.REACT_APP_API_URL);

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

export default api;
