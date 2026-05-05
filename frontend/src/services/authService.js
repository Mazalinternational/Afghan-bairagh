import api from './api';

class AuthService {
  // Register user
  async register(userData) {
    try {
      const response = await api.post('/auth/register/', {
        username: userData.username,
        email: userData.email,
        password: userData.password,
      });
      
      // Mark that user now has an account
      this.markUserHasAccount();
      
      return {
        success: true,
        user: response.data,
        message: 'Registration successful'
      };
    } catch (error) {
      throw {
        success: false,
        message: error.response?.data?.detail || 
                error.response?.data?.username?.[0] ||
                error.response?.data?.email?.[0] ||
                'Registration failed. Please try again.',
      };
    }
  }

  // Login user
  async login(credentials) {
    try {
      const response = await api.post('/api/token/', {
        username: credentials.username,
        password: credentials.password,
      });
      
      const { access, refresh } = response.data;
      
      // Store tokens
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);
      
      // Get user profile
      const userResponse = await this.getCurrentUser();
      
      return {
        success: true,
        user: userResponse,
        token: access,
        refreshToken: refresh,
      };
    } catch (error) {
      throw {
        success: false,
        message: error.response?.data?.detail || 'Login failed. Please check your credentials.',
      };
    }
  }

  // Get current user profile
  async getCurrentUser() {
    try {
      const response = await api.get('/api/auth/profile/');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Refresh token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/api/auth/token/refresh/', {
        refresh: refreshToken,
      });

      const { access } = response.data;
      localStorage.setItem('token', access);
      
      return access;
    } catch (error) {
      this.logout();
      throw error;
    }
  }

  // Logout user
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rememberMe');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('token');
  }

  // Get stored token
  getToken() {
    return localStorage.getItem('token');
  }

  // Set remember me preference
  setRememberMe(remember) {
    if (remember) {
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberMe');
      // If not remembering, clear tokens on browser close
      sessionStorage.setItem('token', localStorage.getItem('token'));
      sessionStorage.setItem('refreshToken', localStorage.getItem('refreshToken'));
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  // Check remember me preference
  getRememberMe() {
    return localStorage.getItem('rememberMe') === 'true';
  }

  // Mark that user has an account (called after successful registration)
  markUserHasAccount() {
    localStorage.setItem('hasAccount', 'true');
  }

  // Check if user has an account
  hasAccount() {
    return localStorage.getItem('hasAccount') === 'true' || 
           localStorage.getItem('rememberMe') === 'true' ||
           localStorage.getItem('token') ||
           localStorage.getItem('refreshToken');
  }
}

export default new AuthService();
