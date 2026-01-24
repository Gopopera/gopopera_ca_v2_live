import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations } from '../translations';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'C1',location:'LanguageContext.tsx:3',message:'react module snapshot',data:{reactType:typeof React,reactVersion:(React as any)?.version || null,useStateType:typeof useState,useContextType:typeof useContext},timestamp:Date.now()})}).catch(()=>{});
// #endregion agent log

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Load from localStorage on init - safely handle SSR/browser differences
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('popera-language');
        return (saved === 'fr' || saved === 'en') ? saved : 'en';
      } catch (e) {
        return 'en';
      }
    }
    return 'en';
  });

  useEffect(() => {
    // Save to localStorage whenever language changes - safely handle browser environment
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('popera-language', language);
      } catch (e) {
        // Silently fail if localStorage is not available
        console.warn('Could not save language preference:', e);
      }
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  // Translation function - supports nested keys like "header.exploreEvents"
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        value = translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if translation not found
          }
        }
        break;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

