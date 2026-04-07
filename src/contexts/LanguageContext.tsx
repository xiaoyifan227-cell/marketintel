'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import zh from '../../messages/zh.json';
import en from '../../messages/en.json';

type Locale = 'zh' | 'en';

const messages = { zh, en } as const;

// Nested key access helper: t('home.title') → messages[locale].home.title
type Messages = typeof zh;

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return path;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur ?? path;
}

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  raw: (key: string) => unknown;
  msgs: Messages;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh');

  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved === 'zh' || saved === 'en') setLocaleState(saved);
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem('locale', l);
  }

  const currentMessages = messages[locale];

  function t(key: string): string {
    const val = getNestedValue(currentMessages, key);
    return typeof val === 'string' ? val : key;
  }

  function raw(key: string): unknown {
    return getNestedValue(currentMessages, key);
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, raw, msgs: currentMessages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
