import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/fallback';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowDownTrayIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import api, { API_BASE_URL } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupDownloading, setBackupDownloading] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [settings, setSettings] = useState({
    system_name: 'Afghan Flag',
    system_logo: null,
    primary_currency: 'AFN',
    currency_symbol: 'AFN',
    date_format: 'YYYY-MM-DD',
    time_format: 'HH:mm:ss',
    timezone: 'Asia/Kabul',
    tax_rate: '0.00',
    low_stock_threshold: 10,
    company_address: '',
    company_phone: '',
    company_email: '',
    backup_auto_enabled: false,
    backup_frequency: 'daily',
    backup_include_excel: true,
    backup_include_sql: true,
    backup_last_auto_run_at: null
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/auth/settings/');
      setSettings(response.data);
      if (response.data.system_logo) {
        const logoUrl = response.data.system_logo;
        setLogoPreview(
          logoUrl.startsWith('http') ? logoUrl : `${API_BASE_URL}${logoUrl}`
        );
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      addToast(t('settings.failedToLoad'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      
      // Append all settings
      Object.keys(settings).forEach(key => {
        if (
          key === 'system_logo' ||
          key === 'backup_last_auto_run_at' ||
          settings[key] === null ||
          settings[key] === undefined
        ) {
          return;
        }
        let val = settings[key];
        if (typeof val === 'boolean') {
          val = val ? 'true' : 'false';
        }
        formData.append(key, val);
      });
      
      // Append logo file if selected
      if (logoFile) {
        formData.append('system_logo', logoFile);
      }
      
      await api.patch('/api/auth/settings/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      addToast(t('settings.settingsSaved'), 'success');
      // Reload to apply new settings
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error saving settings:', error);
      addToast(t('settings.failedToSave'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const downloadBackupFile = async (format) => {
    setBackupDownloading(format);
    try {
      const response = await api.get('/api/auth/backup/download/', {
        params: { export: format },
        responseType: 'blob',
        skipAuthRetry: true
      });
      const cd = response.headers['content-disposition'];
      let filename =
        format === 'excel'
          ? 'system_backup.xlsx'
          : format === 'sql'
            ? 'system_backup.sql'
            : 'system_backup.zip';
      if (cd) {
        const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i.exec(cd);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '').trim();
        }
      }
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast(t('settings.backupDownloadStarted'), 'success');
    } catch (error) {
      let message = t('settings.backupDownloadFailed');
      const status = error.response?.status;
      if (status === 401) {
        message = t('settings.backupNeedJwtLogin');
      } else {
        const data = error.response?.data;
        if (data instanceof Blob) {
          try {
            const text = await data.text();
            const parsed = JSON.parse(text);
            if (parsed.detail) message = parsed.detail;
          } catch {
            /* ignore */
          }
        } else if (data?.detail) {
          message = data.detail;
        }
        if (
          typeof message === 'string' &&
          /credential|not\s+provided|not\s+authenticated/i.test(message)
        ) {
          message = t('settings.backupNeedJwtLogin');
        }
      }
      console.error('Backup download failed:', error);
      addToast(message, 'error');
    } finally {
      setBackupDownloading(null);
    }
  };

  const canManageBackup =
    !!user &&
    (user.role === 'admin' || user.is_superuser === true);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full min-w-0 max-w-full bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 px-3 py-4 sm:px-5 sm:py-6 pb-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 w-full max-w-3xl lg:max-w-5xl mx-auto min-w-0 px-3 sm:px-5 py-4 sm:py-5">
        <div className="space-y-3 sm:space-y-4">
        {/* Header */}
        <PageHeader
          title={t('settings.title')}
          subtitle={t('settings.subtitle')}
          icon={Cog6ToothIcon}
        />

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* System Identity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              {t('settings.systemIdentity')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.systemName')}
                </label>
                <input
                  type="text"
                  name="system_name"
                  value={settings.system_name}
                  onChange={handleChange}
                  className="w-full min-w-0 px-2 py-2 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.systemLogo')}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="w-full min-w-0 max-w-full px-2 py-1 text-[11px] border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white file:mr-1 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[10px] file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900 dark:file:text-blue-200"
                />
                {logoPreview && (
                  <img src={logoPreview} alt="Logo preview" className="mt-1.5 h-8 w-auto object-contain" />
                )}
              </div>
            </div>
          </div>

          {/* Currency Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              {t('settings.currencySettings')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.primaryCurrency')}
                </label>
                <select
                  name="primary_currency"
                  value={settings.primary_currency}
                  onChange={handleChange}
                  className="w-full min-w-0 px-2 py-2 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="AFN">AFN - Afghan Afghani</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.currencySymbol')}
                </label>
                <input
                  type="text"
                  name="currency_symbol"
                  value={settings.currency_symbol}
                  onChange={handleChange}
                  className="w-full min-w-0 px-2 py-2 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Regional Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              {t('settings.regionalSettings')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.dateFormat')}
                </label>
                <input
                  type="text"
                  name="date_format"
                  value={settings.date_format}
                  onChange={handleChange}
                  className="w-full min-w-0 px-2 py-2 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.timeFormat')}
                </label>
                <input
                  type="text"
                  name="time_format"
                  value={settings.time_format}
                  onChange={handleChange}
                  className="w-full min-w-0 px-2 py-2 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.timezone')}
                </label>
                <select
                  name="timezone"
                  value={settings.timezone}
                  onChange={handleChange}
                  className="w-full min-w-0 px-2 py-2 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="Asia/Kabul">Asia/Kabul</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>
            </div>
          </div>

          {/* Business Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              {t('settings.businessSettings')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.taxRate')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="tax_rate"
                  value={settings.tax_rate}
                  onChange={handleChange}
                  className="w-full min-w-0 px-2 py-2 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.lowStockThreshold')}
                </label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  value={settings.low_stock_threshold}
                  onChange={handleChange}
                  className="w-full min-w-0 px-2 py-2 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              {t('settings.contactInfo')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.companyPhone')}
                </label>
                <input
                  type="text"
                  name="company_phone"
                  value={settings.company_phone}
                  onChange={handleChange}
                  className="w-full min-w-0 px-2 py-2 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.companyEmail')}
                </label>
                <input
                  type="email"
                  name="company_email"
                  value={settings.company_email}
                  onChange={handleChange}
                  className="w-full min-w-0 px-2 py-2 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.companyAddress')}
                </label>
                <input
                  type="text"
                  name="company_address"
                  value={settings.company_address}
                  onChange={handleChange}
                  className="w-full min-w-0 px-2 py-2 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Backup & restore — visible to everyone; actions limited to admins / superusers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 min-w-0 border border-dashed border-blue-200 dark:border-blue-900">
              <h2 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                {t('settings.backupSection')}
              </h2>
              {authLoading && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
                  {t('settings.backupAuthLoading')}
                </p>
              )}
              {!authLoading && !user && (
                <p className="text-[10px] text-amber-700 dark:text-amber-400 mb-2">
                  {t('settings.backupNeedsLogin')}
                </p>
              )}
              {!authLoading && user && !canManageBackup && (
                <p className="text-[10px] text-amber-700 dark:text-amber-400 mb-2">
                  {t('settings.backupNeedsAdmin')}
                </p>
              )}
              <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-2">
                {t('settings.backupIntro')}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 border-l-2 border-amber-400/80 dark:border-amber-600 pl-2 mb-2 leading-snug">
                {t('settings.backupJwtVsAdminNote')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                <label className={`flex items-center gap-2 text-[11px] text-gray-700 dark:text-gray-300 ${canManageBackup ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                  <input
                    type="checkbox"
                    name="backup_auto_enabled"
                    checked={!!settings.backup_auto_enabled}
                    disabled={!canManageBackup}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        backup_auto_enabled: e.target.checked
                      }))
                    }
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  {t('settings.backupAutomatic')}
                </label>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('settings.backupFrequency')}
                  </label>
                  <select
                    name="backup_frequency"
                    value={settings.backup_frequency}
                    onChange={handleChange}
                    disabled={!canManageBackup}
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-60"
                  >
                    <option value="daily">{t('settings.backupDaily')}</option>
                    <option value="weekly">{t('settings.backupWeekly')}</option>
                    <option value="monthly">{t('settings.backupMonthly')}</option>
                    <option value="yearly">{t('settings.backupYearly')}</option>
                  </select>
                </div>
                <label className={`flex items-center gap-2 text-[11px] text-gray-700 dark:text-gray-300 ${canManageBackup ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                  <input
                    type="checkbox"
                    checked={!!settings.backup_include_excel}
                    disabled={!canManageBackup}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        backup_include_excel: e.target.checked
                      }))
                    }
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  {t('settings.backupIncludeExcel')}
                </label>
                <label className={`flex items-center gap-2 text-[11px] text-gray-700 dark:text-gray-300 ${canManageBackup ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                  <input
                    type="checkbox"
                    checked={!!settings.backup_include_sql}
                    disabled={!canManageBackup}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        backup_include_sql: e.target.checked
                      }))
                    }
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  {t('settings.backupIncludeSql')}
                </label>
              </div>

              {settings.backup_last_auto_run_at && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
                  {t('settings.backupLastAuto')}:{' '}
                  {new Date(settings.backup_last_auto_run_at).toLocaleString()}
                </p>
              )}

              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
                {t('settings.backupManualHint')}
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadBackupFile('excel')}
                  disabled={!canManageBackup || !!backupDownloading}
                  className="inline-flex items-center justify-center gap-1 w-full sm:w-auto px-3 py-2 sm:py-1.5 text-[11px] rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0" />
                  {backupDownloading === 'excel' ? t('common.loading') : t('settings.backupExcel')}
                </button>
                <button
                  type="button"
                  onClick={() => downloadBackupFile('sql')}
                  disabled={!canManageBackup || !!backupDownloading}
                  className="inline-flex items-center justify-center gap-1 w-full sm:w-auto px-3 py-2 sm:py-1.5 text-[11px] rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0" />
                  {backupDownloading === 'sql' ? t('common.loading') : t('settings.backupSql')}
                </button>
                <button
                  type="button"
                  onClick={() => downloadBackupFile('both')}
                  disabled={!canManageBackup || !!backupDownloading}
                  className="inline-flex items-center justify-center gap-1 w-full sm:w-auto px-3 py-2 sm:py-1.5 text-[11px] rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0" />
                  {backupDownloading === 'both' ? t('common.loading') : t('settings.backupBoth')}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">
                {t('settings.backupAutoLocation')}
              </p>
            </div>

          {/* Save Button */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 min-w-0">
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-form-red w-full sm:w-auto justify-center"
                disabled={saving}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-form-green w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                    {t('common.saving')}
                  </>
                ) : (
                  t('settings.saveSettings')
                )}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
