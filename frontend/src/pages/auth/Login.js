import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/fallback';
import authService from '../../services/authService';
import api from '../../services/api';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { login: authLogin, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [systemLogo, setSystemLogo] = useState('');
  const [systemName, setSystemName] = useState('Afghan Flag');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Load system branding for login header
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const response = await api.get('/api/auth/settings/');
        setSystemName(response.data.system_name || 'Afghan Flag');
        setSystemLogo(response.data.system_logo || '');
      } catch (settingsError) {
        console.error('Error fetching login branding:', settingsError);
      }
    };

    fetchSystemSettings();
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate form
      if (!formData.username.trim()) {
        throw { message: t('auth.emailRequired') };
      }
      if (!formData.password) {
        throw { message: t('auth.passwordRequired') };
      }

      // Use AuthContext login method
      await authLogin({
        username: formData.username.trim(),
        password: formData.password
      });

      authService.setRememberMe(formData.rememberMe);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8 relative overflow-hidden bg-green-50">
      {/* Decorative shapes to match sidebar style */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-green-700/30 rounded-full opacity-60" />
      <div className="absolute top-1/3 -left-10 w-28 h-28 bg-green-700/25 rounded-full opacity-50" />
      <div className="absolute bottom-16 -right-8 w-24 h-24 bg-green-800/30 rounded-full opacity-55" />
      <div className="absolute -bottom-10 left-1/4 w-32 h-32 bg-green-600/25 rounded-full opacity-45" />

      <div className="w-full max-w-xs relative z-10">
          {/* Glass Card Container */}
          <div className="backdrop-blur-xl bg-white/85 p-4 sm:p-5 rounded-3xl shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)] border border-green-100/90 relative">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400/10 to-emerald-500/10 blur-xl" />
            
            <div className="relative space-y-4">
              {/* Header */}
              <div className="text-center">
                {systemLogo ? (
                  <img
                    src={systemLogo}
                    alt={systemName}
                    className="w-12 h-12 mx-auto mb-3 rounded-full object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-emerald-700 to-green-800 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                )}
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1 tracking-tight">
                  {t('auth.welcomeBack')}
                </h2>
              </div>

              {/* Login Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50/90 backdrop-blur-sm border border-red-200/70 text-red-700 px-4 py-3 rounded-2xl text-sm shadow-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Email/Username Field */}
                  <div>
                    <label htmlFor="username" className="block text-xs font-semibold text-slate-700 mb-2 ml-1 uppercase tracking-wide">
                      {t('auth.emailUsername')}
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-white/70 backdrop-blur-md border-0 ring-1 ring-slate-200/80 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-700/50 shadow-sm transition-all duration-300 hover:bg-white hover:ring-slate-300/70 focus:bg-white"
                      placeholder={t('auth.emailUsernamePlaceholder')}
                      disabled={loading}
                    />
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-2 ml-1 uppercase tracking-wide">
                      {t('auth.password')}
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 pr-12 bg-white/70 backdrop-blur-md border-0 ring-1 ring-slate-200/80 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-700/50 shadow-sm transition-all duration-300 hover:bg-white hover:ring-slate-300/70 focus:bg-white"
                        placeholder={t('auth.passwordPlaceholder')}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-slate-100/60 rounded-r-2xl transition-colors duration-200"
                        onClick={togglePasswordVisibility}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center">
                    <input
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      className="h-4 w-4 text-green-700 focus:ring-green-700/40 border-slate-300 rounded shadow-sm"
                      disabled={loading}
                    />
                    <label htmlFor="rememberMe" className="ml-3 block text-sm font-medium text-slate-700">
                      {t('auth.rememberMe')}
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-semibold text-green-700 hover:text-green-800 transition-colors">
                      {t('auth.forgotPassword')}
                    </a>
                  </div>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-form-green w-full py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('auth.signingIn')}
                      </div>
                    ) : (
                      t('auth.signIn')
                    )}
                  </button>
                </div>

                {/* Additional Links */}
                <div className="text-center pt-2">
                  <p className="text-xs text-slate-600">
                    {t('auth.noAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/register')}
                      className="font-semibold text-green-700 hover:text-green-800 transition-colors"
                    >
                      {t('auth.createAccount')}
                    </button>
                  </p>
                </div>
              </form>

              <div className="h-1" />
            </div>
          </div>
        </div>
    </div>
  );
};

export default Login;
