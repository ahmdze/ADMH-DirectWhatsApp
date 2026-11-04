import { useCallback, useEffect } from 'react';
import type { Locale } from '../types';
import { useSettings } from './settings';
import { PHONE_ERRORS, type PhoneErrorCode } from './phone';
import { formatDate, formatNumber, formatTime, relativeTime } from './format';
import { loadKurdish, useKurdish } from './kuStore';
import { loadPersian, usePersian } from './faStore';

export interface I18n {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
  /** Pick the right string: t('عربي', 'English'). Sorani/Persian resolve lazily. */
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
  const fa = usePersian();

  useEffect(() => {
    if (locale === 'ckb') loadKurdish();
    if (locale === 'fa') loadPersian();
  }, [locale]);

  const t = useCallback((ar: string, en: string) => {
    if (locale === 'en') return en;
    if (locale === 'ckb') return ku[ar] || en;
    if (locale === 'fa') return fa[ar] || en;
    return ar;
  }, [locale, ku, fa]);
  return {
    locale,
    dir: locale === 'en' ? 'ltr' : 'rtl',
    isRTL: locale !== 'en',
    t,
    n: (value: number) => formatNumber(value, locale),
    date: (timestamp: number) => formatDate(timestamp, locale),
    time: (timestamp: number) => formatTime(timestamp, locale),
    rel: (timestamp: number) => relativeTime(timestamp, locale),
    phoneError: (code: PhoneErrorCode) => {
      if (locale === 'ckb') return ku[PHONE_ERRORS[code].ar] || PHONE_ERRORS[code].en;
      if (locale === 'fa') return fa[PHONE_ERRORS[code].ar] || PHONE_ERRORS[code].en;
      return PHONE_ERRORS[code][locale];
    }
  };
}

export function getLocale(): Locale {
  try {
    const raw = localStorage.getItem('admh2_settings');
    const match = raw?.match(/"locale":"(ar|en|ckb|fa)"/);
    return (match?.[1] as Locale) || 'ar';
  } catch {
    return 'ar';
  }
}
