import { useCallback, useEffect, useState } from 'react';
import { Icon, type IconName } from '../../components/icons';
import { Button, EmptyState, HintCard, IconButton, ScreenHeader, Spinner } from '../../components/ui';
import { APP_VERSION } from '../../lib/changelog';
import { writeClipboardText } from '../../lib/clipboard';
import { downloadTextFile } from '../../lib/csv';
import { isStandalone } from '../../lib/format';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import { canShareFiles, formatBytes } from '../../lib/image';
import { countryByIso } from '../../lib/phone';
import { notificationPermission } from '../../lib/notifications';
import { goBack } from '../../lib/router';
import { supportsNativeBarcode } from '../../lib/scan';
import { FONTS, getSettings, resolveFont } from '../../lib/settings';
import { getStorageInfo, type StorageInfo } from '../../lib/storage';
import { toast } from '../../lib/toast';
import { biometricAvailable } from '../../lib/webauthn';

/* ------------------------------------------------------------------ types */

type DiagnosticStatus = 'ok' | 'warn' | 'no' | 'info';

interface DiagnosticRow {
  id: string;
  labelAr: string;
  labelEn: string;
  valueAr: string;
  valueEn: string;
  status: DiagnosticStatus;
  hintAr?: string;
  hintEn?: string;
  progress?: number;
}

interface DiagnosticSection {
  id: string;
  titleAr: string;
  titleEn: string;
  rows: DiagnosticRow[];
}

interface DiagnosticsData {
  generatedAt: number;
  sections: DiagnosticSection[];
  userAgent: string;
  environment: Record<string, string | number | boolean | null>;
  capabilities: Record<string, string | number | boolean | null>;
  storage: StorageInfo;
  settings: {
    locale: string;
    font: string;
    theme: string;
    accent: string;
    defaultCountry: string;
    hideNumbers: boolean;
    notifications: boolean;
    lockEnabled: boolean;
    lockMethod: string;
  };
}

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

type CameraPermission = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown';

/* -------------------------------------------------------------- constants */

const STATUS_STYLE: Record<DiagnosticStatus, { color: string; background: string; icon: IconName }> = {
  ok: { color: 'var(--accent)', background: 'var(--accent-soft)', icon: 'check' },
  warn: { color: 'var(--warning)', background: 'rgba(252, 211, 77, 0.14)', icon: 'info' },
  no: { color: 'var(--danger)', background: 'var(--danger-soft)', icon: 'alert' },
  info: { color: 'var(--muted)', background: 'var(--glass-2)', icon: 'sparkles' }
};

const SECTION_ICONS: Record<string, IconName> = {
  app: 'info',
  security: 'shield',
  capabilities: 'sparkles',
  storage: 'database',
  display: 'globe',
  prefs: 'settings'
};

const LOCALE_LABELS: Record<string, { ar: string; en: string }> = {
  ar: { ar: 'العربية', en: 'Arabic' },
  en: { ar: 'الإنجليزية', en: 'English' },
  ckb: { ar: 'الكردية (سوراني)', en: 'Kurdish (Sorani)' },
  fa: { ar: 'الفارسية', en: 'Persian' }
};

const THEME_LABELS: Record<string, { ar: string; en: string }> = {
  dark: { ar: 'داكن', en: 'Dark' },
  light: { ar: 'فاتح', en: 'Light' },
  auto: { ar: 'تلقائي', en: 'Auto' }
};

function row(
  id: string,
  labelAr: string,
  labelEn: string,
  valueAr: string,
  valueEn: string,
  status: DiagnosticStatus = 'info',
  hintAr?: string,
  hintEn?: string,
  progress?: number
): DiagnosticRow {
  return { id, labelAr, labelEn, valueAr, valueEn, status, hintAr, hintEn, progress };
}

/* --------------------------------------------------------------- collect */

async function serviceWorkerRegistered(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(registration);
  } catch {
    return false;
  }
}

async function cameraPermission(): Promise<CameraPermission> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return 'unsupported';
  try {
    const status = await navigator.permissions.query({ name: 'camera' } as unknown as PermissionDescriptor);
    return status.state;
  } catch {
    return 'prompt';
  }
}

function notificationValue(permission: ReturnType<typeof notificationPermission>): { ar: string; en: string; status: DiagnosticStatus } {
  if (permission === 'granted') return { ar: 'مسموح', en: 'Granted', status: 'ok' };
  if (permission === 'denied') return { ar: 'مرفوض', en: 'Denied', status: 'no' };
  if (permission === 'default') return { ar: 'لم يُطلب بعد', en: 'Not requested', status: 'warn' };
  return { ar: 'غير مدعوم', en: 'Unsupported', status: 'no' };
}

function cameraValue(permission: CameraPermission): { ar: string; en: string; status: DiagnosticStatus } {
  if (permission === 'granted') return { ar: 'مسموح', en: 'Granted', status: 'ok' };
  if (permission === 'denied') return { ar: 'مرفوض', en: 'Denied', status: 'no' };
  if (permission === 'prompt') return { ar: 'يُطلب عند الحاجة', en: 'Asked when needed', status: 'warn' };
  if (permission === 'unknown') return { ar: 'غير معروف', en: 'Unknown', status: 'warn' };
  return { ar: 'غير مدعوم', en: 'Unsupported', status: 'no' };
}

async function collectDiagnostics(): Promise<DiagnosticsData> {
  const settings = getSettings();
  const [storage, swRegistered, biometric, camera] = await Promise.all([
    getStorageInfo(),
    serviceWorkerRegistered(),
    biometricAvailable(),
    cameraPermission()
  ]);

  const nav = navigator;
  const clipboardSupported = typeof nav.clipboard?.writeText === 'function';
  const bridge = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
  const native = Boolean(bridge?.isNativePlatform?.());
  const platformName = native ? bridge?.getPlatform?.() ?? 'native' : 'web';
  const standalone = isStandalone();
  const permissions = notificationPermission();
  const notifications = notificationValue(permissions);
  const cameraInfo = cameraValue(camera);
  const resolvedFont = resolveFont(settings.locale, settings.font);
  const fontChoice = FONTS.find((choice) => choice.id === settings.font) ?? FONTS[0];
  const fontResolved = FONTS.find((choice) => choice.id === resolvedFont) ?? fontChoice;
  const localeLabel = LOCALE_LABELS[settings.locale] ?? { ar: settings.locale, en: settings.locale };
  const themeLabel = THEME_LABELS[settings.theme] ?? { ar: settings.theme, en: settings.theme };
  const country = countryByIso(settings.defaultCountry);
  const timeZone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return '';
    }
  })();
  const languages = Array.isArray(nav.languages) ? nav.languages.join(', ') : nav.language;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const darkScheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const orientation = window.screen.orientation?.type ?? '';
  const viewport = `${window.innerWidth}×${window.innerHeight}`;
  const screenSize = `${window.screen.width}×${window.screen.height}`;
  const pixelRatio = window.devicePixelRatio || 1;
  const touch = nav.maxTouchPoints > 0;
  const percent = storage.percent;
  const storageStatus: DiagnosticStatus = percent === null ? 'info' : percent >= 95 ? 'no' : percent >= 85 ? 'warn' : 'ok';

  const sections: DiagnosticSection[] = [
    {
      id: 'app',
      titleAr: 'التطبيق والتثبيت',
      titleEn: 'App & install',
      rows: [
        row('version', 'الإصدار', 'Version', APP_VERSION, APP_VERSION, 'info'),
        row(
          'platform',
          'المنصّة',
          'Platform',
          native ? `تطبيق أصلي (${platformName})` : 'متصفح / PWA',
          native ? `Native app (${platformName})` : 'Browser / PWA',
          native ? 'ok' : 'info'
        ),
        row(
          'standalone',
          'وضع العرض',
          'Display mode',
          native ? 'تطبيق أصلي (WebView)' : standalone ? 'مثبّت كتطبيق' : 'داخل المتصفح',
          native ? 'Native app (WebView)' : standalone ? 'Installed app' : 'In browser',
          native || standalone ? 'ok' : 'warn',
          native ? undefined : standalone ? undefined : 'ثبّت التطبيق من قائمة المتصفح لتجربة أفضل.',
          native ? undefined : standalone ? undefined : 'Install the app from the browser menu for a better experience.'
        ),
        row(
          'online',
          'الاتصال',
          'Connection',
          nav.onLine ? 'متصل' : 'غير متصل',
          nav.onLine ? 'Online' : 'Offline',
          nav.onLine ? 'ok' : 'warn',
          nav.onLine ? undefined : 'كل الميزات المحلية تعمل دون اتصال.',
          nav.onLine ? undefined : 'All local features keep working offline.'
        ),
        row(
          'secure',
          'سياق آمن',
          'Secure context',
          window.isSecureContext ? 'HTTPS' : 'غير آمن',
          window.isSecureContext ? 'HTTPS' : 'Not secure',
          window.isSecureContext ? 'ok' : 'no',
          window.isSecureContext ? undefined : 'الكاميرا والتخزين الدائم يحتاجان HTTPS.',
          window.isSecureContext ? undefined : 'The camera and persistent storage need HTTPS.'
        ),
        row(
          'sw',
          'Service Worker',
          'Service worker',
          native
            ? 'غير مطلوب في التطبيق الأصلي'
            : !('serviceWorker' in nav)
              ? 'غير مدعوم'
              : swRegistered
                ? 'مسجّل'
                : 'غير مسجّل',
          native
            ? 'Not needed in the native app'
            : !('serviceWorker' in nav)
              ? 'Unsupported'
              : swRegistered
                ? 'Registered'
                : 'Not registered',
          native ? 'ok' : !('serviceWorker' in nav) ? 'no' : swRegistered ? 'ok' : 'warn',
          native ? 'ملفات التطبيق مضمّنة داخل الـAPK.' : swRegistered ? undefined : 'قد لا يعمل التطبيق دون اتصال حتى أول تحميل ناجح.',
          native ? 'App assets are bundled inside the APK.' : swRegistered ? undefined : 'Offline use may not work until the first successful load.'
        )
      ]
    },
    {
      id: 'security',
      titleAr: 'الأذونات والأمان',
      titleEn: 'Permissions & security',
      rows: [
        row(
          'notifications',
          'إذن الإشعارات',
          'Notification permission',
          notifications.ar,
          notifications.en,
          notifications.status,
          'تُستخدم لإشعارات التذكيرات المحلية فقط.',
          'Used only for local reminder notifications.'
        ),
        row(
          'camera',
          'الكاميرا',
          'Camera',
          cameraInfo.ar,
          cameraInfo.en,
          cameraInfo.status,
          'لا تُفتح الكاميرا إلا بعد زر صريح.',
          'The camera opens only after an explicit tap.'
        ),
        row(
          'webauthn',
          'WebAuthn (البصمة)',
          'WebAuthn (biometrics)',
          typeof PublicKeyCredential === 'undefined' ? 'غير مدعوم' : 'مدعوم',
          typeof PublicKeyCredential === 'undefined' ? 'Unsupported' : 'Supported',
          typeof PublicKeyCredential === 'undefined' ? 'warn' : 'ok',
          typeof PublicKeyCredential === 'undefined' ? 'يمكن استخدام PIN بدلاً من البصمة.' : undefined,
          typeof PublicKeyCredential === 'undefined' ? 'PIN can be used instead of biometrics.' : undefined
        ),
        row(
          'biometric',
          'مستشعر البصمة',
          'Platform authenticator',
          biometric ? 'متاح' : 'غير متاح',
          biometric ? 'Available' : 'Unavailable',
          biometric ? 'ok' : 'warn',
          biometric ? undefined : 'يُستخدم PIN لفتح التطبيق.',
          biometric ? undefined : 'A PIN is used to unlock the app.'
        ),
        row(
          'lock',
          'قفل التطبيق',
          'App lock',
          settings.lock.enabled ? (settings.lock.method === 'biometric' ? 'مفعّل (بصمة)' : 'مفعّل (PIN)') : 'غير مفعّل',
          settings.lock.enabled ? (settings.lock.method === 'biometric' ? 'Enabled (biometric)' : 'Enabled (PIN)') : 'Disabled',
          'info'
        )
      ]
    },
    {
      id: 'capabilities',
      titleAr: 'قدرات المتصفح',
      titleEn: 'Browser capabilities',
      rows: [
        row(
          'barcode',
          'قارئ QR الأصلي',
          'Native QR reader',
          supportsNativeBarcode() ? 'مدعوم' : 'غير مدعوم',
          supportsNativeBarcode() ? 'Supported' : 'Unsupported',
          supportsNativeBarcode() ? 'ok' : 'warn',
          supportsNativeBarcode() ? undefined : 'سيُستخدم فك الترميز الداخلي (jsQR) بدلاً منه.',
          supportsNativeBarcode() ? undefined : 'The built-in jsQR decoder will be used instead.'
        ),
        row(
          'share',
          'مشاركة النظام',
          'Web Share',
          native || typeof nav.share === 'function' ? 'مدعوم' : 'غير مدعوم',
          native || typeof nav.share === 'function' ? 'Supported' : 'Unsupported',
          native || typeof nav.share === 'function' ? 'ok' : 'warn',
          native ? 'تُستخدم نافذة المشاركة الأصلية في Android.' : undefined,
          native ? 'The native Android share sheet is used.' : undefined
        ),
        row(
          'share-files',
          'مشاركة الصور',
          'Share files',
          canShareFiles() ? 'مدعوم' : 'غير مدعوم',
          canShareFiles() ? 'Supported' : 'Unsupported',
          canShareFiles() ? 'ok' : 'warn',
          canShareFiles() ? undefined : 'ستُستبدل مشاركة الصور بالتنزيل.',
          canShareFiles() ? undefined : 'Image sharing falls back to downloading.'
        ),
        row(
          'idb',
          'IndexedDB',
          'IndexedDB',
          typeof indexedDB === 'undefined' ? 'غير مدعوم' : 'مدعوم',
          typeof indexedDB === 'undefined' ? 'Unsupported' : 'Supported',
          typeof indexedDB === 'undefined' ? 'no' : 'ok'
        ),
        row(
          'clipboard',
          'الحافظة',
          'Clipboard',
          clipboardSupported ? 'مدعوم' : 'غير مدعوم',
          clipboardSupported ? 'Supported' : 'Unsupported',
          clipboardSupported ? 'ok' : 'warn'
        ),
        row(
          'print',
          'الطباعة / PDF',
          'Print / PDF',
          typeof window.print === 'function' ? 'متاح' : 'غير متاح',
          typeof window.print === 'function' ? 'Available' : 'Unavailable',
          typeof window.print === 'function' ? 'ok' : 'warn'
        ),
        row(
          'download',
          'تنزيل الملفات',
          'File downloads',
          'download' in document.createElement('a') ? 'مدعوم' : 'غير مدعوم',
          'download' in document.createElement('a') ? 'Supported' : 'Unsupported',
          'download' in document.createElement('a') ? 'ok' : 'warn'
        ),
        row(
          'vibration',
          'الاهتزاز',
          'Vibration',
          'vibrate' in nav ? 'مدعوم' : 'غير مدعوم',
          'vibrate' in nav ? 'Supported' : 'Unsupported',
          'vibrate' in nav ? 'ok' : 'info'
        )
      ]
    },
    {
      id: 'storage',
      titleAr: 'التخزين',
      titleEn: 'Storage',
      rows: [
        row('usage', 'المستخدم', 'Used', formatBytes(storage.usage), formatBytes(storage.usage), 'info'),
        row('quota', 'المتاح', 'Quota', formatBytes(storage.quota), formatBytes(storage.quota), 'info'),
        row(
          'percent',
          'نسبة الاستخدام',
          'Usage',
          percent === null ? 'غير معروف' : `${percent}%`,
          percent === null ? 'Unknown' : `${percent}%`,
          storageStatus,
          percent !== null && percent >= 85 ? 'قرّب نفاد المساحة — صدّر نسخة احتياطية.' : undefined,
          percent !== null && percent >= 85 ? 'Storage is nearly full — export a backup.' : undefined,
          percent ?? undefined
        ),
        row(
          'persisted',
          'تخزين دائم',
          'Persistent storage',
          storage.persisted ? 'مفعّل' : 'غير مفعّل',
          storage.persisted ? 'Enabled' : 'Disabled',
          storage.persisted ? 'ok' : 'warn',
          storage.persisted ? undefined : 'قد يمسح المتصفح البيانات عند نقص المساحة.',
          storage.persisted ? undefined : 'The browser may evict data when storage is low.'
        )
      ]
    },
    {
      id: 'display',
      titleAr: 'اللغة والعرض',
      titleEn: 'Language & display',
      rows: [
        row('locale', 'لغة التطبيق', 'App language', localeLabel.ar, localeLabel.en, 'info'),
        row(
          'font',
          'الخط',
          'Font',
          `${fontChoice.ar} → ${fontResolved.ar}`,
          `${fontChoice.en} → ${fontResolved.en}`,
          'info'
        ),
        row(
          'dir',
          'اتجاه الواجهة',
          'Interface direction',
          settings.locale === 'en' ? 'LTR' : 'RTL',
          settings.locale === 'en' ? 'LTR' : 'RTL',
          'info'
        ),
        row('viewport', 'أبعاد النافذة', 'Viewport', viewport, viewport, 'info'),
        row('ratio', 'كثافة البكسل', 'Pixel ratio', `${pixelRatio}x`, `${pixelRatio}x`, 'info'),
        row('screen', 'أبعاد الشاشة', 'Screen', screenSize, screenSize, 'info'),
        row('orientation', 'اتجاه الشاشة', 'Orientation', orientation || '—', orientation || '—', 'info'),
        row('touch', 'اللمس', 'Touch', touch ? 'شاشة لمس' : 'فأرة/لوحة', touch ? 'Touch screen' : 'Mouse/keyboard', 'info'),
        row(
          'motion',
          'تقليل الحركة',
          'Reduced motion',
          reducedMotion ? 'مفعّل' : 'غير مفعّل',
          reducedMotion ? 'Enabled' : 'Disabled',
          'info'
        ),
        row(
          'scheme',
          'مظهر النظام',
          'System scheme',
          darkScheme ? 'داكن' : 'فاتح',
          darkScheme ? 'Dark' : 'Light',
          'info'
        ),
        row('languages', 'لغات المتصفح', 'Browser languages', languages, languages, 'info'),
        row('timezone', 'المنطقة الزمنية', 'Time zone', timeZone || '—', timeZone || '—', 'info')
      ]
    },
    {
      id: 'prefs',
      titleAr: 'تفضيلات التطبيق',
      titleEn: 'App preferences',
      rows: [
        row('theme', 'المظهر', 'Theme', themeLabel.ar, themeLabel.en, 'info'),
        row('accent', 'لون التمييز', 'Accent', settings.accent, settings.accent, 'info'),
        row(
          'country',
          'الدولة الافتراضية',
          'Default country',
          country ? `${country.ar} (+${country.dial})` : settings.defaultCountry,
          country ? `${country.en} (+${country.dial})` : settings.defaultCountry,
          'info'
        ),
        row(
          'hide',
          'إخفاء الأرقام',
          'Hide numbers',
          settings.hideNumbers ? 'مفعّل' : 'غير مفعّل',
          settings.hideNumbers ? 'Enabled' : 'Disabled',
          'info'
        ),
        row(
          'notif-setting',
          'إشعارات التذكير',
          'Reminder notifications',
          settings.notifications ? 'مفعّلة' : 'متوقفة',
          settings.notifications ? 'Enabled' : 'Disabled',
          'info'
        )
      ]
    }
  ];

  const environment: Record<string, string | number | boolean | null> = {
    userAgent: nav.userAgent,
    platform: nav.platform,
    nativePlatform: platformName,
    language: nav.language,
    languages,
    timeZone,
    standalone,
    secureContext: window.isSecureContext,
    online: nav.onLine,
    viewport,
    pixelRatio,
    screen: screenSize,
    orientation: orientation || null,
    touchPoints: nav.maxTouchPoints,
    reducedMotion,
    colorScheme: darkScheme ? 'dark' : 'light',
    themeColorMeta: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null
  };

  const capabilities: Record<string, string | number | boolean | null> = {
    serviceWorker: 'serviceWorker' in nav,
    serviceWorkerRegistered: swRegistered,
    notifications: permissions,
    camera,
    barcodeDetector: supportsNativeBarcode(),
    webShare: typeof nav.share === 'function',
    webShareFiles: canShareFiles(),
    webAuthn: typeof PublicKeyCredential !== 'undefined',
    platformAuthenticator: biometric,
    indexedDB: typeof indexedDB !== 'undefined',
    clipboard: clipboardSupported,
    print: typeof window.print === 'function',
    downloadAttribute: 'download' in document.createElement('a'),
    vibration: 'vibrate' in nav
  };

  return {
    generatedAt: Date.now(),
    sections,
    userAgent: nav.userAgent,
    environment,
    capabilities,
    storage,
    settings: {
      locale: settings.locale,
      font: `${settings.font} (${resolvedFont})`,
      theme: settings.theme,
      accent: settings.accent,
      defaultCountry: settings.defaultCountry,
      hideNumbers: settings.hideNumbers,
      notifications: settings.notifications,
      lockEnabled: settings.lock.enabled,
      lockMethod: settings.lock.method
    }
  };
}

/* ---------------------------------------------------------------- reports */

function buildReport(data: DiagnosticsData): Record<string, unknown> {
  return {
    app: 'admh-direct-whatsapp',
    version: APP_VERSION,
    generatedAt: new Date(data.generatedAt).toISOString(),
    environment: data.environment,
    capabilities: data.capabilities,
    storage: data.storage,
    settings: data.settings,
    checks: data.sections.flatMap((section) =>
      section.rows.map((item) => ({
        section: section.id,
        id: item.id,
        label: item.labelEn,
        value: item.valueEn,
        status: item.status
      }))
    )
  };
}

function buildReportText(data: DiagnosticsData): string {
  const lines: string[] = [];
  lines.push('ADMH Direct WhatsApp — Diagnostics report');
  lines.push(`Generated: ${new Date(data.generatedAt).toISOString()}`);
  lines.push(`Version: ${APP_VERSION}`);
  lines.push('');
  for (const section of data.sections) {
    lines.push(`== ${section.titleEn} ==`);
    for (const item of section.rows) {
      lines.push(`${item.labelEn}: ${item.valueEn}${item.status === 'ok' ? '' : ` [${item.status}]`}`);
    }
    lines.push('');
  }
  lines.push(`User agent: ${data.userAgent}`);
  lines.push('');
  lines.push('This report contains technical capability information only.');
  lines.push('It contains no phone numbers, messages or other personal data.');
  return lines.join('\n');
}

/* --------------------------------------------------------------- component */

function CapabilityRow({ item }: { item: DiagnosticRow }) {
  const { t } = useI18n();
  const meta = STATUS_STYLE[item.status];
  const value = t(item.valueAr, item.valueEn);
  return (
    <div className="list-row" style={{ alignItems: 'flex-start' }}>
      <span
        className="avatar"
        aria-hidden="true"
        style={{ width: 30, height: 30, borderRadius: 10, background: meta.background, color: meta.color }}
      >
        <Icon name={meta.icon} size={14} />
      </span>
      <div className="list-main" style={{ gap: 2 }}>
        <div className="row-between" style={{ gap: 8 }}>
          <span className="list-title" style={{ fontSize: 12.5 }}>
            {t(item.labelAr, item.labelEn)}
          </span>
          <span
            className="badge"
            dir="auto"
            title={value}
            style={{
              color: meta.color,
              maxWidth: '54%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block'
            }}
          >
            {value}
          </span>
        </div>
        {item.hintAr ? (
          <span className="list-sub" style={{ whiteSpace: 'normal', fontSize: 10 }}>
            {t(item.hintAr, item.hintEn ?? item.hintAr)}
          </span>
        ) : null}
        {typeof item.progress === 'number' ? (
          <div
            style={{ height: 6, borderRadius: 999, background: 'var(--glass-3)', overflow: 'hidden', marginTop: 4 }}
            role="img"
            aria-label={value}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, item.progress))}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--accent-2))'
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** E5 — device / browser capability report, generated locally. */
export function DiagnosticsScreen() {
  const { t, n, time } = useI18n();
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const collect = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const next = await collectDiagnostics();
      setData(next);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void collect();
  }, [collect]);

  const copyReport = async () => {
    if (!data) return;
    const copied = await writeClipboardText(JSON.stringify(buildReport(data), null, 2));
    if (copied) {
      hapticSuccess();
      toast(t('تم نسخ تقرير التشخيص (JSON)', 'Diagnostics report copied (JSON)'), 'success');
    } else {
      hapticError();
      toast(t('تعذّر النسخ — جرّب تصدير الملف.', 'Could not copy — try exporting the file.'), 'error');
    }
  };

  const exportReport = () => {
    if (!data) return;
    const day = new Date(data.generatedAt).toISOString().slice(0, 10);
    downloadTextFile(buildReportText(data), `admh-diagnostics-${day}.txt`);
    hapticSuccess();
    toast(t('تم تنزيل تقرير نصي', 'A text report was downloaded'), 'success');
  };

  const copyUserAgent = async () => {
    if (!data) return;
    const copied = await writeClipboardText(data.userAgent);
    toast(copied ? t('تم نسخ معرّف المتصفح', 'User agent copied') : t('تعذّر النسخ', 'Could not copy'), copied ? 'success' : 'error');
  };

  const summary = data
    ? [
        { label: t('الإصدار', 'Version'), value: APP_VERSION },
        { label: t('المنصة', 'Platform'), value: t(data.sections[0]?.rows[1]?.valueAr ?? '—', data.sections[0]?.rows[1]?.valueEn ?? '—') },
        {
          label: t('المساحة', 'Storage'),
          value: data.storage.percent === null ? '—' : `${n(data.storage.percent)}%`
        }
      ]
    : [];

  return (
    <div className="screen">
      <ScreenHeader
        title={t('تشخيص الجهاز', 'Device diagnostics')}
        subtitle={t(
          'قدرات جهازك ومتصفحك كما يراها التطبيق — كل شيء يُحسب محلياً.',
          'Your device and browser capabilities as the app sees them — computed locally.'
        )}
        onBack={() => goBack()}
        action={<IconButton name="refresh" label={t('إعادة الفحص', 'Refresh')} onClick={() => void collect()} variant="accent" />}
      />

      {loading ? (
        <section className="glass card col" style={{ gap: 12, alignItems: 'center', paddingBlock: 30 }}>
          <Spinner size={28} />
          <p className="page-sub" style={{ margin: 0 }}>
            {t('جارٍ جمع معلومات الجهاز…', 'Collecting device information…')}
          </p>
        </section>
      ) : failed || !data ? (
        <EmptyState
          icon="alert"
          title={t('تعذّر إنشاء التقرير', 'Could not build the report')}
          description={t(
            'حدث خطأ أثناء قراءة قدرات المتصفح. أعد المحاولة.',
            'Something went wrong while reading the browser capabilities. Try again.'
          )}
          action={
            <Button variant="primary" onClick={() => void collect()}>
              {t('إعادة المحاولة', 'Try again')}
            </Button>
          }
        />
      ) : (
        <>
          <section className="glass card col" style={{ gap: 10 }}>
            <div className="row" style={{ gap: 11, alignItems: 'flex-start' }}>
              <span className="brand-mark" style={{ width: 42, height: 42, borderRadius: 14 }} aria-hidden="true">
                <Icon name="info" size={20} />
              </span>
              <div className="grow">
                <b style={{ fontSize: 13.5 }}>{t('تقرير الجهاز والمتصفح', 'Device & browser report')}</b>
                <p className="page-sub" style={{ marginTop: 2 }}>
                  {t('آخر تحديث', 'Last updated')}: {time(data.generatedAt)}
                </p>
              </div>
              <span className="badge accent">{t('محلي', 'Local')}</span>
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {summary.map((item) => (
                <span key={item.label} className="badge">
                  {item.label}: {item.value}
                </span>
              ))}
            </div>
          </section>

          {data.sections.map((section) => (
            <section key={section.id} className="glass card col" style={{ gap: 6 }}>
              <div className="section-head">
                <div className="row" style={{ gap: 7 }}>
                  <Icon name={SECTION_ICONS[section.id] ?? 'info'} size={15} style={{ color: 'var(--accent)' }} />
                  <h2 className="section-title">{t(section.titleAr, section.titleEn)}</h2>
                </div>
                <span className="badge">{n(section.rows.length)}</span>
              </div>
              <div className="list">
                {section.rows.map((item) => (
                  <CapabilityRow key={`${section.id}-${item.id}`} item={item} />
                ))}
              </div>
            </section>
          ))}

          <section className="glass card col" style={{ gap: 6 }}>
            <div className="section-head">
              <h2 className="section-title">{t('معرّف المتصفح (UA)', 'User agent')}</h2>
              <IconButton name="copy" label={t('نسخ معرّف المتصفح', 'Copy user agent')} variant="plain" size={16} onClick={() => void copyUserAgent()} />
            </div>
            <p dir="ltr" style={{ margin: 0, fontSize: 10.5, lineHeight: 1.7, color: 'var(--muted)', wordBreak: 'break-all' }}>
              {data.userAgent}
            </p>
          </section>

          <div className="grid-2">
            <Button variant="primary" onClick={() => void copyReport()}>
              <Icon name="copy" size={16} />
              {t('نسخ التقرير', 'Copy report')}
            </Button>
            <Button variant="soft" onClick={exportReport}>
              <Icon name="download" size={16} />
              {t('تصدير نصي', 'Export text')}
            </Button>
          </div>

          <HintCard icon="shield">
            {t(
              'التقرير يحتوي معلومات تقنية فقط — لا أرقام ولا رسائل، ولا يُرسل تلقائياً إلى أي مكان. انسخه أو صدّره بنفسك عند الحاجة.',
              'The report contains technical information only — no numbers and no messages, and it is never sent anywhere automatically. Copy or export it yourself when needed.'
            )}
          </HintCard>
        </>
      )}
    </div>
  );
}
