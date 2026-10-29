import { useState, useEffect } from 'react';
import en from '../locales/en.json';
import hi from '../locales/hi.json';

const dictionaries = {
  en,
  hi,
};

export function useTranslation(lang: 'en' | 'hi' = 'en') {
  const [dictionary, setDictionary] = useState(dictionaries[lang]);

  useEffect(() => {
    setDictionary(dictionaries[lang]);
  }, [lang]);

  // This function lets you do: t('customer.dashboardTitle')
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = dictionary;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key; // Falls back to the key itself if translation is missing
  };

  return { t };
}