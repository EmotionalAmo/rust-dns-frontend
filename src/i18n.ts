import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

const STORAGE_KEY = 'rust-dns-lang';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      'en-US': { translation: enUS },
    },
    lng: localStorage.getItem(STORAGE_KEY) ?? 'zh-CN',
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export function setLanguage(lang: 'zh-CN' | 'en-US') {
  i18n.changeLanguage(lang);
  localStorage.setItem(STORAGE_KEY, lang);
}

export default i18n;
