/**
 * Date formatting utility - uses Solar Hijri (Jalali) for Dari, Gregorian for English
 */

const getCurrentLanguage = () => {
  const raw = localStorage.getItem('i18nextLng') || document?.documentElement?.lang || 'en';
  return String(raw).toLowerCase();
};

const isDariLikeLanguage = (lang) =>
  lang === 'prs' || lang === 'ps' || lang.startsWith('fa');

/**
 * Format a date based on current language
 * - Dari (prs): Solar Hijri (Jalali) calendar
 * - English: Gregorian calendar
 */
export const formatDate = (dateInput, options = {}) => {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const lang = getCurrentLanguage();

  if (isDariLikeLanguage(lang)) {
    // Solar Hijri (Jalali) - Afghan Dari
    // fa-AF = Persian (Afghanistan), persian calendar = Solar Hijri
    return new Intl.DateTimeFormat('fa-AF', {
      calendar: 'persian',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options
    }).format(date);
  }

  // Gregorian for English
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  }).format(date);
};

/**
 * Format date with time
 */
export const formatDateTime = (dateInput, options = {}) => {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const lang = getCurrentLanguage();

  if (isDariLikeLanguage(lang)) {
    return new Intl.DateTimeFormat('fa-AF', {
      calendar: 'persian',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }).format(date);
};

/**
 * Format time based on current language
 */
export const formatTime = (dateInput, options = {}) => {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const lang = getCurrentLanguage();

  if (isDariLikeLanguage(lang)) {
    return new Intl.DateTimeFormat('fa-AF', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      ...options
    }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options
  }).format(date);
};

/**
 * Format date with long month (e.g. "January 2024" or "جدی ۱۴۰۳")
 */
export const formatDateLong = (dateInput) => {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const lang = getCurrentLanguage();

  if (isDariLikeLanguage(lang)) {
    return new Intl.DateTimeFormat('fa-AF', {
      calendar: 'persian',
      year: 'numeric',
      month: 'long'
    }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long'
  }).format(date);
};

/**
 * Format date for input[type="date"] - always returns YYYY-MM-DD (Gregorian)
 * Use when setting value on date inputs - they require Gregorian
 */
export const formatDateForInput = (dateInput) => {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};
