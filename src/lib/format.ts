import type { Locale } from '../types';

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function intlLocale(locale: Locale): string {
  if (locale === 'ar') return 'ar-IQ';
  if (locale === 'fa') return 'fa-IR';
  if (locale === 'ckb') return 'ar-IQ';
  return 'en-GB';
}

export function formatNumber(value: number, locale: Locale): string {
  if (locale === 'ar') {
    return new Intl.NumberFormat('ar-IQ', { useGrouping: true }).format(value);
  }
  if (locale === 'fa') {
    return new Intl.NumberFormat('fa-IR', { useGrouping: true }).format(value);
  }
  return new Intl.NumberFormat('en-US').format(value);
}

export function toArabicDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
}

export function formatDate(timestamp: number, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'short', year: 'numeric' }).format(timestamp);
  } catch {
    return new Date(timestamp).toLocaleDateString();
  }
}

export function formatTime(timestamp: number, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), { hour: '2-digit', minute: '2-digit' }).format(timestamp);
  } catch {
    return new Date(timestamp).toLocaleTimeString();
  }
}

export function relativeTime(timestamp: number, locale: Locale): string {
  const diff = timestamp - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale === 'fa' ? 'fa' : locale === 'ar' || locale === 'ckb' ? 'ar' : 'en', { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000000],
    ['month', 2592000000],
    ['week', 604800000],
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000]
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(Math.round(diff / 1000), 'second');
}

export function initials(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '؟';
  const firstWord = trimmed.split(/\s+/).filter(Boolean)[0] || trimmed;
  return Array.from(firstWord).slice(0, 2).join('');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}
