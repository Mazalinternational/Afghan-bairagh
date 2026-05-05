import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    system_name: 'Afghan Flag',
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/auth/settings/');
      // Ensure currency_symbol is AFN
      const settingsData = {
        ...response.data,
        currency_symbol: 'AFN',
        primary_currency: 'AFN'
      };
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Use defaults if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = () => {
    fetchSettings();
  };

  // Helper to format currency
  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return `${settings.currency_symbol} ${numAmount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const value = {
    settings,
    loading,
    refreshSettings,
    formatCurrency,
    currencySymbol: settings.currency_symbol,
    primaryCurrency: settings.primary_currency
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
