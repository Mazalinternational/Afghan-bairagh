import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from '../i18n/fallback';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('i18nextLng') || 'en';
    if (savedLanguage !== currentLanguage) {
      changeLanguage(savedLanguage);
    }
  }, []);

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setCurrentLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    // Update HTML dir attribute for RTL support (Dari & Pashto)
    const isRTL = lang === 'prs' || lang === 'ps';
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  };

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'en' ? 'prs' : 'en';
    changeLanguage(newLang);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
