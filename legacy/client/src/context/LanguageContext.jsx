import { createContext, useCallback, useContext, useState } from 'react';
import { T } from '../i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('clever_lang') || 'fr');

  function switchLang(l) {
    localStorage.setItem('clever_lang', l);
    setLang(l);
  }

  const t = useCallback((key, vars = {}) => {
    const str = T[lang]?.[key] ?? T.fr?.[key] ?? key;
    return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  return useContext(LanguageContext).t;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  return { lang: ctx.lang, switchLang: ctx.switchLang };
}
