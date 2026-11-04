import { useCallback, useEffect } from 'react';
import type { Locale } from '../types';
import { useSettings } from './settings';
import { PHONE_ERRORS, type PhoneErrorCode } from './phone';
import { formatDate, formatNumber, formatTime, relativeTime } from './format';
import { loadKurdish, useKurdish } from './kuStore';

export interface I18n {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
  /** Pick the right string: t('عربي', 'English'). Sorani is resolved from the lazy KU dictionary. */
  t: (ar: string, en: string) => string;
  n: (value: number) => string;
  date: (timestamp: number) => string;
  time: (timestamp: number) => string;
  rel: (timestamp: number) => string;
  phoneError: (code: PhoneErrorCode) => string;
}

export function useI18n(): I18n {
  const { locale } = useSettings();
  const ku = useKurdish();

  useEffect(() => {
    if (locale === 'ckb') loadKurdish();
  }, [locale]);

  const t = useCallback((ar: string, en: string) => {
    if (locale === 'en') return en;
    if (locale === 'ckb') return ku[ar] || en;
    return ar;
  }, [locale, ku]);
  return {
    locale,
    dir: locale === 'en' ? 'ltr' : 'rtl',
    isRTL: locale !== 'en',
    t,
    n: (value: number) => formatNumber(value, locale),
    date: (timestamp: number) => formatDate(timestamp, locale),
    time: (timestamp: number) => formatTime(timestamp, locale),
    rel: (timestamp: number) => relativeTime(timestamp, locale),
    phoneError: (code: PhoneErrorCode) => (locale === 'ckb' ? ku[PHONE_ERRORS[code].ar] || PHONE_ERRORS[code].en : PHONE_ERRORS[code][locale])
  };
}

export function getLocale(): Locale {
  try {
    const raw = localStorage.getItem('admh2_settings');
    const match = raw?.match(/"locale":"(ar|en|ckb)"/);
    return (match?.[1] as Locale) || 'ar';
  } catch {
    return 'ar';
  }
}
