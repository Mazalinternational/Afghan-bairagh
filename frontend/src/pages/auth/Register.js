import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import authService from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/fallback';
import PrintingPressImage from '../../components/common/PrintingPressImage';

const Register = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Password strength calculation
  const calculatePasswordStrength = (password) => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    Object.values(checks).forEach(check => check && score++);
    
    return {
      score,
      checks,
      strength: score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong'
    };
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  // Real-time validation
  const validateField = (name, value) => {
    const errors = {};
    
    switch (name) {
      case 'username':
        if (!value.trim()) {
          errors.username = t('auth.usernameRequired');
        } else if (value.length < 3) {
          errors.username = t('auth.usernameMinLength');
        } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          errors.username = t('auth.usernameInvalid');
        }
        break;
        
      case 'email':
        if (!value.trim()) {
          errors.email = t('auth.emailRequired');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = t('auth.emailInvalid');
        }
        break;
        
      case 'password':
        if (!value) {
          errors.password = t('auth.passwordRequired');
        } else if (value.length < 8) {
          errors.password = t('auth.passwordMinLength');
        }
        break;
        
      case 'confirmPassword':
        if (!value) {
          errors.confirmPassword = t('auth.confirmPasswordRequired');
        } else if (value !== formData.password) {
          errors.confirmPassword = t('auth.passwordsDontMatch');
        }
        break;
    }
    
    return errors;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Real-time validation
    if (name !== 'acceptTerms') {
      const fieldError = validateField(name, newValue);
      setFieldErrors(prev => ({
        ...prev,
        ...fieldError,
        [name]: fieldError[name] || null
      }));
      
      // Also validate confirm password if password changes
      if (name === 'password' && formData.confirmPassword) {
        const confirmError = validateField('confirmPassword', formData.confirmPassword);
        setFieldErrors(prev => ({
          ...prev,
          ...confirmError
        }));
      }
    }
    
    // Clear general error when user starts typing
    if (error) setError('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Validate all fields
      const allErrors = {
        ...validateField('username', formData.username),
        ...validateField('email', formData.email),
        ...validateField('password', formData.password),
        ...validateField('confirmPassword', formData.confirmPassword)
      };
      
      if (Object.keys(allErrors).some(key => allErrors[key])) {
        setFieldErrors(allErrors);
        throw new Error(t('auth.fixValidationErrors'));
      }
      
      if (!formData.acceptTerms) {
        throw new Error(t('auth.acceptTermsRequired'));
      }
      
      if (passwordStrength.strength === 'weak') {
        throw new Error(t('auth.chooseStrongerPassword'));
      }
      
      // Register user
      const registerResponse = await authService.register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password
      });
      
      if (registerResponse.success) {
        // Auto-login after successful registration
        await login({
          username: formData.username.trim(),
          password: formData.password
        });
        
        // Redirect to dashboard
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator component
  const PasswordStrengthIndicator = () => (
    <div className="mt-2">
      <div className="flex items-center space-x-2 mb-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              passwordStrength.strength === 'weak' ? 'bg-red-500 w-1/3' :
              passwordStrength.strength === 'medium' ? 'bg-yellow-500 w-2/3' :
              'bg-green-500 w-full'
            }`}
          />
        </div>
        <span className={`text-xs font-medium ${
          passwordStrength.strength === 'weak' ? 'text-red-600' :
          passwordStrength.strength === 'medium' ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {t(`auth.${passwordStrength.strength}`)}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-1 text-xs">
        {[
          [t('auth.atLeast8Chars'), passwordStrength.checks.length],
          [t('auth.lowercaseLetter'), passwordStrength.checks.lowercase],
          [t('auth.uppercaseLetter'), passwordStrength.checks.uppercase],
          [t('auth.number'), passwordStrength.checks.number],
          [t('auth.specialChar'), passwordStrength.checks.special]
        ].map(([label, met]) => (
          <div key={label} className={`flex items-center space-x-1 ${met ? 'text-green-600' : 'text-gray-400'}`}>
            {met ? (
              <CheckIcon className="h-3 w-3" />
            ) : (
              <XMarkIcon className="h-3 w-3" />
            )}
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Left side - Printing Press Image */}
      <PrintingPressImage />
      
      {/* Right side - Register Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 lg:bg-gradient-to-br lg:from-blue-100 lg:via-purple-50 lg:to-indigo-200 relative overflow-hidden">
        {/* Mobile Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat lg:hidden"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1586953208448-b95a79798f07?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`
          }}
        />
        {/* Mobile Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/70 to-indigo-900/80 lg:hidden" />
        
        {/* Background Pattern - Desktop Only */}
        <div className="absolute inset-0 opacity-5 hidden lg:block">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='53' cy='7' r='1'/%3E%3Ccircle cx='7' cy='53' r='1'/%3E%3Ccircle cx='53' cy='53' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        
        <div className="max-w-xs w-full space-y-4 relative z-10">
          {/* Glass Card Container */}
          <div className="backdrop-blur-xl bg-white/70 p-4 rounded-2xl shadow-2xl border border-white/20 relative">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/10 to-purple-400/10 blur-xl" />
            
            <div className="relative">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="w-10 h-10 mx-auto mb-2 bg-[#2F6690] rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">
                  {t('auth.createAccountTitle')}
                </h2>
                <p className="text-xs text-gray-600">
                  {t('auth.joinSystem')}
                </p>
              </div>

              {/* Register Form */}
              <form className="space-y-3" onSubmit={handleSubmit}>
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 px-4 py-3 rounded-xl text-sm shadow-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Username Field */}
                  <div>
                    <label htmlFor="username" className="block text-xs font-semibold text-gray-700 mb-2 ml-1">
                      {t('auth.username')}
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 bg-white/60 backdrop-blur-md border-0 ring-1 ${fieldErrors.username ? 'ring-red-300/60' : 'ring-gray-200/60'} placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2F6690]/50 shadow-sm transition-all duration-300 hover:bg-white/80 hover:ring-gray-300/60 focus:bg-white/90 text-sm`}
                      placeholder={t('auth.usernamePlaceholder')}
                      disabled={loading}
                    />
                    {fieldErrors.username && (
                      <p className="mt-1 text-xs text-red-600 ml-1">{fieldErrors.username}</p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-2 ml-1">
                      {t('auth.emailAddress')}
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 bg-white/60 backdrop-blur-md border-0 ring-1 ${fieldErrors.email ? 'ring-red-300/60' : 'ring-gray-200/60'} placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2F6690]/50 shadow-sm transition-all duration-300 hover:bg-white/80 hover:ring-gray-300/60 focus:bg-white/90 text-sm`}
                      placeholder={t('auth.emailPlaceholder')}
                      disabled={loading}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs text-red-600 ml-1">{fieldErrors.email}</p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-2 ml-1">
                      {t('auth.password')}
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 pr-10 bg-white/60 backdrop-blur-md border-0 ring-1 ${fieldErrors.password ? 'ring-red-300/60' : 'ring-gray-200/60'} placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2F6690]/50 shadow-sm transition-all duration-300 hover:bg-white/80 hover:ring-gray-300/60 focus:bg-white/90 text-sm`}
                        placeholder={t('auth.passwordPlaceholder')}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-100/30 rounded-r-2xl transition-colors duration-200"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        )}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1 text-xs text-red-600 ml-1">{fieldErrors.password}</p>
                    )}
                    {formData.password && <PasswordStrengthIndicator />}
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 mb-2 ml-1">
                      {t('auth.confirmPassword')}
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 pr-10 bg-white/60 backdrop-blur-md border-0 ring-1 ${fieldErrors.confirmPassword ? 'ring-red-300/60' : 'ring-gray-200/60'} placeholder-gray-400 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2F6690]/50 shadow-sm transition-all duration-300 hover:bg-white/80 hover:ring-gray-300/60 focus:bg-white/90 text-sm`}
                        placeholder={t('auth.confirmPasswordPlaceholder')}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-100/30 rounded-r-2xl transition-colors duration-200"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={loading}
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        )}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-600 ml-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Terms Acceptance */}
                <div className="flex items-center">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#2F6690] focus:ring-[#2F6690]/50 border-gray-300 rounded shadow-sm"
                    disabled={loading}
                  />
                  <label htmlFor="acceptTerms" className="ml-3 block text-xs text-gray-700">
                    {t('auth.acceptTerms')}{' '}
                    <a href="#" className="text-[#2F6690] hover:text-[#2F6690]/80 transition-colors">
                      {t('auth.termsAndConditions')}
                    </a>{' '}
                    {t('auth.and')}{' '}
                    <a href="#" className="text-[#2F6690] hover:text-[#2F6690]/80 transition-colors">
                      {t('auth.privacyPolicy')}
                    </a>
                  </label>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={loading || !formData.acceptTerms}
                    className="btn-form-green w-full py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('auth.creatingAccount')}
                  </div>
                ) : (
                  t('auth.createAccountTitle')
                )}
              </button>
            </div>

                {/* Additional Links */}
                <div className="text-center pt-3">
                  <p className="text-xs text-gray-600">
                    {t('auth.alreadyHaveAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="font-semibold text-[#2F6690] hover:text-[#2F6690]/80 transition-colors"
                    >
                      {t('auth.signInHere')}
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
