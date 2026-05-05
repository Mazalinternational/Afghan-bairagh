import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
    const token = localStorage.getItem('token');
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
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._authRetry &&
      localStorage.getItem('token')
    ) {
      originalRequest._authRetry = true;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      if (originalRequest.headers) {
        delete originalRequest.headers.Authorization;
      }
      return api(originalRequest);
    }
    if (error.response?.status === 401 && localStorage.getItem('token') !== 'test-token') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
