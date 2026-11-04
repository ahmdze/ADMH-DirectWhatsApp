import { useCallback } from 'react';
import type { Locale } from '../types';
import { useSettings } from './settings';
import { PHONE_ERRORS, type PhoneErrorCode } from './phone';
import { formatDate, formatNumber, formatTime, relativeTime } from './format';

export interface I18n {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
  /** Pick the right string: t('عربي', 'English') */
  t: (ar: string, en: string) => string;
  n: (value: number) => string;
  date: (timestamp: number) => string;
  time: (timestamp: number) => string;
  rel: (timestamp: number) => string;
  phoneError: (code: PhoneErrorCode) => string;
}

export function useI18n(): I18n {
  const { locale } = useSettings();
  const t = useCallback((ar: string, en: string) => (locale === 'en' ? en : ar), [locale]);
  return {
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    isRTL: locale === 'ar',
    t,
    n: (value: number) => formatNumber(value, locale),
    date: (timestamp: number) => formatDate(timestamp, locale),
    time: (timestamp: number) => formatTime(timestamp, locale),
    rel: (timestamp: number) => relativeTime(timestamp, locale),
    phoneError: (code: PhoneErrorCode) => PHONE_ERRORS[code][locale]
  };
}

export function getLocale(): Locale {
  try {
    return localStorage.getItem('admh2_settings')?.includes('"locale":"en"') ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}
