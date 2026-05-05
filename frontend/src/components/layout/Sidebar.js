import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslation } from '../../i18n/fallback';
import api from '../../services/api';

const Sidebar = ({ isMobileOpen, onMobileClose }) => {
  const { logout } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const [systemName, setSystemName] = useState('Afghan Flag');
  const [systemLogo, setSystemLogo] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isRTL = currentLanguage === 'prs' || currentLanguage === 'ps';

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const response = await api.get('/api/auth/settings/');
      setSystemName(response.data.system_name || 'Afghan Flag');
      setSystemLogo(response.data.system_logo || '');
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  };

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', key: 'dashboard' },
    { name: t('nav.sales'), href: '/sales', key: 'sales' },
    { name: t('nav.customers'), href: '/customers', key: 'customers' },
    { name: t('nav.employees'), href: '/employees', key: 'employees' },
    { name: t('nav.inventory'), href: '/inventory', key: 'inventory' },
    { name: t('nav.orders'), href: '/orders', key: 'orders' },
    { name: t('nav.quotations'), href: '/quotations', key: 'quotations' },
    { name: t('nav.purchases'), href: '/purchases', key: 'purchases' },
    { name: t('nav.suppliers'), href: '/suppliers', key: 'suppliers' },
    { name: t('nav.expenses'), href: '/expenses', key: 'expenses' },
    { name: t('nav.rozNamcha'), href: '/roznamcha', key: 'rozNamcha' },
    { name: t('nav.rent'), href: '/rent', key: 'rent' },
    { name: t('nav.printingPress'), href: '/printing', key: 'printingPress' },
    { name: t('nav.reports'), href: '/reports', key: 'reports' },
    { name: t('nav.bank'), href: '/bank', key: 'bank' },
    { name: t('nav.recordLookup'), href: '/records/search', key: 'recordLookup' },
    { name: t('nav.settings'), href: '/settings', key: 'settings' },
    { name: t('nav.userManagement'), href: '/users', key: 'users' },
  ];

  const handleNavClick = () => {
    if (onMobileClose) onMobileClose();
  };

  const sidebarContent = (
    <>
      <div className="p-4 flex-shrink-0 relative z-10">
        {systemLogo ? (
          <img src={systemLogo} alt={systemName} className="h-8 w-8 mb-2 rounded-[50%] object-cover" />
        ) : null}
        <h1 className="text-gray-900 dark:text-white text-sm font-bold truncate">{systemName}</h1>
      </div>
      <nav className="mt-8 flex-1 overflow-y-auto relative z-10" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {navigation.map((item) => (
          <NavLink
            key={item.key}
            to={item.href}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center justify-center md:justify-start px-3 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors text-sm ${
                isActive ? 'bg-blue-200 dark:bg-gray-700 md:border-r-4 border-blue-600 dark:border-blue-400 font-semibold text-blue-700 dark:text-blue-400' : ''
              }`
            }
            title={item.name}
          >
            <span className="text-xs md:text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-blue-200 dark:border-gray-700 flex-shrink-0 relative z-10">
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="flex items-center justify-between w-full px-3 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors text-sm rounded-lg"
        >
          <span className="text-xs md:text-sm">{t('nav.settings') || 'Settings'}</span>
          {isSettingsOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
        </button>
        {isSettingsOpen && (
          <div className="space-y-1 mt-1">
            <div className="px-3 py-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('nav.settings')} – زبان / Language
            </div>
            <button
              onClick={() => changeLanguage('en')}
              className={`flex items-center justify-center md:justify-start w-full px-3 py-2 transition-colors text-sm rounded-lg ${currentLanguage === 'en' ? 'bg-blue-200 dark:bg-gray-700 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700'}`}
            >
              <span className="text-xs md:text-sm w-full text-center md:text-left">English</span>
            </button>
            <button
              onClick={() => changeLanguage('prs')}
              className={`flex items-center justify-center md:justify-start w-full px-3 py-2 transition-colors text-sm rounded-lg ${currentLanguage === 'prs' ? 'bg-blue-200 dark:bg-gray-700 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700'}`}
            >
              <span className="text-xs md:text-sm w-full text-center md:text-left">دری</span>
            </button>
            <button
              onClick={() => changeLanguage('ps')}
              className={`flex items-center justify-center md:justify-start w-full px-3 py-2 transition-colors text-sm rounded-lg ${currentLanguage === 'ps' ? 'bg-blue-200 dark:bg-gray-700 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700'}`}
            >
              <span className="text-xs md:text-sm w-full text-center md:text-left">پښتو</span>
            </button>
            <button
              onClick={toggleDarkMode}
              className="flex items-center justify-center md:justify-start w-full px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors text-sm rounded-lg"
              title={isDark ? t('common.lightMode') : t('common.darkMode')}
            >
              <span className="text-xs md:text-sm w-full text-center md:text-left">
                {isDark ? t('common.lightMode') : t('common.darkMode')}
              </span>
            </button>
            <button
              onClick={logout}
              className="flex items-center justify-center md:justify-start w-full px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors text-sm rounded-lg"
              title={t('nav.logout')}
            >
              <span className="text-xs md:text-sm w-full text-center md:text-left">
                {t('nav.logout')}
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      {/* Sidebar: glass effect with decorative shapes */}
      <div
        className={`
          w-64 md:w-44 h-screen flex flex-col fixed top-0 z-50
          bg-blue-50 dark:bg-gray-800 shadow-md relative overflow-hidden ${isRTL ? 'border-l border-blue-200 dark:border-gray-700 right-0 md:right-0 md:left-auto' : 'border-r border-blue-200 dark:border-gray-700 left-0'}
          transition-transform duration-300 ease-out
          md:translate-x-0
          ${
            isMobileOpen
              ? 'translate-x-0'
              : isRTL
                ? 'translate-x-full'
                : '-translate-x-full'
          }
        `}
      >
        {/* Decorative shapes */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400/40 dark:bg-blue-600/30 rounded-full opacity-50" />
        <div className="absolute top-1/3 -left-8 w-24 h-24 bg-blue-400/40 dark:bg-blue-600/30 rounded-full opacity-30" />
        <div className="absolute bottom-20 -right-6 w-20 h-20 bg-blue-400/40 dark:bg-blue-600/30 rounded-full opacity-40" />
        
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden absolute top-3 right-3 p-1.5 rounded text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-blue-100 dark:hover:bg-gray-700 z-50"
            aria-label="Close menu"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
