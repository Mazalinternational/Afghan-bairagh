// Use fallback translation system (works without i18next packages)
import fallbackTranslations from './fallback';

// Default to fallback
let i18nInstance = {
  language: fallbackTranslations.currentLang,
  changeLanguage: fallbackTranslations.setLanguage
};

let useTranslationHook = () => ({
  t: fallbackTranslations.getTranslation,
  i18n: {
    language: fallbackTranslations.currentLang,
    changeLanguage: fallbackTranslations.setLanguage
  }
});

export default i18nInstance;
export { useTranslationHook as useTranslation };
