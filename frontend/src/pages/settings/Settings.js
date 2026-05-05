import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/fallback';
import { useToast } from '../../context/ToastContext';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    company_email: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/auth/settings/');
      setSettings(response.data);
      if (response.data.system_logo) {
        setLogoPreview(`http://localhost:8000${response.data.system_logo}`);
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
        if (key !== 'system_logo' && settings[key] !== null && settings[key] !== undefined) {
          formData.append(key, settings[key]);
        }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 w-full max-w-3xl lg:max-w-4xl mx-auto px-1 sm:px-2">
        <div className="space-y-2 p-2">
        {/* Header */}
        <PageHeader
          title={t('settings.title')}
          subtitle={t('settings.subtitle')}
          icon={Cog6ToothIcon}
        />

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* System Identity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
            <h2 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              {t('settings.systemIdentity')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.systemName')}
                </label>
                <input
                  type="text"
                  name="system_name"
                  value={settings.system_name}
                  onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.systemLogo')}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="w-full px-2 py-1 text-[11px] border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white file:mr-1 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[10px] file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900 dark:file:text-blue-200"
                />
                {logoPreview && (
                  <img src={logoPreview} alt="Logo preview" className="mt-1.5 h-8 w-auto object-contain" />
                )}
              </div>
            </div>
          </div>

          {/* Currency Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
            <h2 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              {t('settings.currencySettings')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.primaryCurrency')}
                </label>
                <select
                  name="primary_currency"
                  value={settings.primary_currency}
                  onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Regional Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
            <h2 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              {t('settings.regionalSettings')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.dateFormat')}
                </label>
                <input
                  type="text"
                  name="date_format"
                  value={settings.date_format}
                  onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.timezone')}
                </label>
                <select
                  name="timezone"
                  value={settings.timezone}
                  onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
            <h2 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              {t('settings.businessSettings')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
            <h2 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              {t('settings.contactInfo')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.companyPhone')}
                </label>
                <input
                  type="text"
                  name="company_phone"
                  value={settings.company_phone}
                  onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.companyAddress')}
                </label>
                <input
                  type="text"
                  name="company_address"
                  value={settings.company_address}
                  onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-form-red"
                disabled={saving}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-form-green disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
