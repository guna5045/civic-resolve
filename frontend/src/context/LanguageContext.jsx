import React, { createContext, useState } from 'react';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import te from '../locales/te.json';
import ta from '../locales/ta.json';
import kn from '../locales/kn.json';
import ml from '../locales/ml.json';

const translations = { en, hi, te, ta, kn, ml };

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem('locale') || 'en';
  });

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLocale(lang);
      localStorage.setItem('locale', lang);
    }
  };

  // Safe nested translation lookup with optional {param} interpolation
  const t = (key, params) => {
    if (!key) return '';
    
    // Safeguard: normalize role strings that might be passed raw
    const normalizedKey = key
      .replace(/Department Officer/g, 'officer')
      .replace(/Citizen/g, 'citizen')
      .replace(/Admin/g, 'admin');

    const keys = normalizedKey.split('.');
    let result = translations[locale];
    
    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        // Fallback to English translation
        let fallback = translations['en'];
        for (const fk of keys) {
          if (fallback && fallback[fk] !== undefined) {
            fallback = fallback[fk];
          } else {
            // Never display raw translation keys. Fallback to a readable capitalization of the last part
            const lastPart = keys[keys.length - 1];
            return lastPart
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .trim();
          }
        }
        result = fallback;
        break;
      }
    }

    // Interpolate {param} placeholders if params provided
    if (typeof result === 'string' && params && typeof params === 'object') {
      return result.replace(/\{(\w+)\}/g, (_, paramKey) =>
        params[paramKey] !== undefined ? params[paramKey] : `{${paramKey}}`
      );
    }

    return result;
  };


  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
