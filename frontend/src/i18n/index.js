/**
 * Central i18n exports
 * Use formatDate, formatTime, formatDateLong for date display - automatically uses Solar Hijri when Dari is selected
 */
export { formatDate, formatTime, formatDateTime, formatDateLong, formatDateForInput } from './dateUtils';
export { useTranslation, getTranslation, setLanguage } from './fallback';
