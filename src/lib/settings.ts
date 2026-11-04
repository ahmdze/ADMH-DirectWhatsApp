import { useSyncExternalStore } from 'react';
import type { FontChoice, Locale, RetentionSettings, Settings, ThemeMode } from '../types';
import { isIos } from './format';

const STORAGE_KEY = 'admh2_settings';
export const SETTINGS_VERSION = 3;

export interface AccentChoice {
  id: string;
  color: string;
  ar: string;
  en: string;
}

export const ACCENTS: AccentChoice[] = [
  { id: 'emerald', color: '#6EE7B7', ar: 'زمردي', en: 'Emerald' },
  { id: 'teal', color: '#2DD4BF', ar: 'فيروزي', en: 'Teal' },
  { id: 'sky', color: '#7DD3FC', ar: 'سماوي', en: 'Sky' },
  { id: 'violet', color: '#C4B5FD', ar: 'بنفسجي', en: 'Violet' },
  { id: 'amber', color: '#FCD34D', ar: 'ذهبي', en: 'Amber' },
  { id: 'rose', color: '#FDA4AF', ar: 'وردي', en: 'Rose' }
];

export interface FontChoiceInfo {
  id: FontChoice;
  ar: string;
  en: string;
  family: string;
}

export const FONTS: FontChoiceInfo[] = [
  { id: 'auto', ar: 'تلقائي حسب اللغة', en: 'Auto by language', family: '' },
  {
    id: 'cairo',
    ar: 'كايرو',
    en: 'Cairo',
    family: "'Cairo Variable', 'Segoe UI', Tahoma, system-ui, sans-serif"
  },
  {
    id: 'vazirmatn',
    ar: 'فازيرماتن — فارسي',
    en: 'Vazirmatn — Persian',
    family: "'Vazirmatn Variable', 'Cairo Variable', Tahoma, system-ui, sans-serif"
  },
  {
    id: 'noto-naskh',
    ar: 'نوتو نسخ — كردي',
    en: 'Noto Naskh — Kurdish',
    family: "'Noto Naskh Arabic Variable', 'Cairo Variable', Tahoma, system-ui, sans-serif"
  }
];

const FONT_IDS: FontChoice[] = FONTS.map((font) => font.id);

/** Recommended font per language when the user keeps "auto". */
export function resolveFont(locale: Locale, choice: FontChoice): FontChoice {
  if (choice !== 'auto') return choice;
  if (locale === 'fa') return 'vazirmatn';
  if (locale === 'ckb') return 'noto-naskh';
  return 'cairo';
}

export function fontFamily(choice: FontChoice): string {
  return FONTS.find((font) => font.id === choice)?.family || FONTS[1].family;
}

const THEMES: ThemeMode[] = ['dark', 'light', 'auto'];
const LOCALES: Locale[] = ['ar', 'en', 'ckb', 'fa'];

function detectLocale(): Locale {
  // Arabic-first product: Arabic is the default; users can switch to English
  // from Settings at any time.
  return 'ar';
}

function defaults(): Settings {
  return {
    version: SETTINGS_VERSION,
    theme: 'dark',
    accent: '#6EE7B7',
    locale: detectLocale(),
    font: 'auto',
    defaultCountry: 'IQ',
    haptics: true,
    hideNumbers: false,
    activeWorkspaceId: 'personal',
    lock: { enabled: false, method: 'pin', hash: undefined, salt: undefined, credentialId: null },
    installBannerDismissed: false,
    notifications: false,
    onboarded: false,
    lastSeenVersion: '',
    retention: {
      historyEnabled: false,
      retentionDays: 30,
      keepLatest: null,
      excludeFavoriteTargets: true,
      trashDays: 30
    },
    updatedAt: Date.now()
  };
}

function normalize(raw: unknown): Settings {
  const base = defaults();
  if (!raw || typeof raw !== 'object') return base;
  const value = raw as Partial<Settings> & { lock?: Partial<Settings['lock']> };
  return {
    ...base,
    theme: THEMES.includes(value.theme as ThemeMode) ? (value.theme as ThemeMode) : base.theme,
    accent: typeof value.accent === 'string' && /^#[0-9a-f]{6}$/i.test(value.accent) ? value.accent : base.accent,
    locale: LOCALES.includes(value.locale as Locale) ? (value.locale as Locale) : 'ar',
    font: FONT_IDS.includes(value.font as FontChoice) ? (value.font as FontChoice) : 'auto',
    defaultCountry: typeof value.defaultCountry === 'string' && /^[A-Z]{2}$/.test(value.defaultCountry) ? value.defaultCountry : base.defaultCountry,
    haptics: typeof value.haptics === 'boolean' ? value.haptics : base.haptics,
    hideNumbers: typeof value.hideNumbers === 'boolean' ? value.hideNumbers : base.hideNumbers,
    activeWorkspaceId: typeof value.activeWorkspaceId === 'string' && value.activeWorkspaceId ? value.activeWorkspaceId : base.activeWorkspaceId,
    lock: {
      enabled: Boolean(value.lock?.enabled),
      method: value.lock?.method === 'biometric' ? 'biometric' : 'pin',
      hash: typeof value.lock?.hash === 'string' ? value.lock.hash : undefined,
      salt: typeof value.lock?.salt === 'string' ? value.lock.salt : undefined,
      credentialId: typeof value.lock?.credentialId === 'string' ? value.lock.credentialId : null
    },
    installBannerDismissed: Boolean(value.installBannerDismissed),
    notifications: typeof value.notifications === 'boolean' ? value.notifications : base.notifications,
    // Existing users (they have a stored settings object) should not see the
    // first-run tour again after this update.
    onboarded: typeof value.onboarded === 'boolean' ? value.onboarded : true,
    lastSeenVersion: typeof value.lastSeenVersion === 'string' ? value.lastSeenVersion : '',
    retention: normalizeRetention(value.retention),
    version: SETTINGS_VERSION,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : base.updatedAt
  };
}

function normalizeRetention(raw: unknown): RetentionSettings {
  const value = raw && typeof raw === 'object' ? (raw as Partial<RetentionSettings>) : {};
  const allowedDays = [7, 30, 90, 365, 0] as const;
  const days = Number(value.retentionDays);
  const keepLatest = Number(value.keepLatest);
  const trashDays = Number(value.trashDays);
  return {
    historyEnabled: typeof value.historyEnabled === 'boolean' ? value.historyEnabled : false,
    retentionDays: (allowedDays as readonly number[]).includes(days)
      ? (days as RetentionSettings['retentionDays'])
      : 30,
    keepLatest: Number.isFinite(keepLatest) && keepLatest > 0 ? Math.floor(keepLatest) : null,
    excludeFavoriteTargets: typeof value.excludeFavoriteTargets === 'boolean' ? value.excludeFavoriteTargets : true,
    trashDays: Number.isFinite(trashDays) ? Math.min(365, Math.max(1, Math.floor(trashDays))) : 30,
    lastRunAt: typeof value.lastRunAt === 'number' ? value.lastRunAt : undefined
  };
}

let cached: Settings | null = null;
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cached = normalize(raw ? JSON.parse(raw) : null);
  } catch {
    cached = defaults();
  }
  return cached;
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateSettings(patch: Partial<Settings> | ((current: Settings) => Partial<Settings>)): Settings {
  const current = getSettings();
  const changes = typeof patch === 'function' ? patch(current) : patch;
  const next = normalize({ ...current, ...changes, lock: { ...current.lock, ...(changes.lock || {}) }, updatedAt: Date.now() });
  cached = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage may be full — settings are non-critical */
  }
  applyAppearance(next);
  listeners.forEach((listener) => listener());
  return next;
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettings, getSettings);
}

export function prefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'auto') return prefersDark() ? 'dark' : 'light';
  return mode;
}

export function applyAppearance(settings: Settings): void {
  if (typeof document === 'undefined') return;
  const theme = resolveTheme(settings.theme);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.accent = settings.accent;
  root.dataset.font = resolveFont(settings.locale, settings.font);
  root.lang = settings.locale;
  root.dir = settings.locale === 'en' ? 'ltr' : 'rtl';
  root.style.setProperty('--app-font', fontFamily(resolveFont(settings.locale, settings.font)));
  root.style.setProperty('--accent', settings.accent);
  root.classList.toggle('hide-numbers', settings.hideNumbers);
  root.classList.toggle('is-ios', isIos());
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#06110f' : '#eef5f2');
}

export function watchSystemTheme(): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    const current = getSettings();
    if (current.theme === 'auto') applyAppearance(current);
  };
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
}

/** For backup import. */
export function replaceSettingsFromBackup(raw: unknown): void {
  cached = normalize(raw);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    /* ignore */
  }
  applyAppearance(cached);
  listeners.forEach((listener) => listener());
}
