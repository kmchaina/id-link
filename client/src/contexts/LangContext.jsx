import { createContext, useContext, useState } from 'react';
import { translations } from '../i18n/translations';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('idlink_lang') || 'en');

  const toggle = () => {
    const next = lang === 'en' ? 'sw' : 'en';
    localStorage.setItem('idlink_lang', next);
    setLang(next);
  };

  const t = (key) => translations[lang]?.[key] ?? translations.en[key] ?? key;

  return <LangContext.Provider value={{ lang, toggle, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
