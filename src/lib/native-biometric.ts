/**
 * Native biometric authentication for the Capacitor Android/iOS shell.
 *
 * The web build keeps using WebAuthn (`lib/webauthn.ts`); this module is the
 * native counterpart built on `@capgo/capacitor-native-biometric`. It is loaded
 * lazily so the PWA bundle never pulls the plugin.
 *
 * Important: this file must not import `lib/native.ts` — that module imports the
 * router/launch/settings stack and would create a circular import through
 * `webauthn.ts`. The Capacitor bridge is inspected directly via `window.Capacitor`.
 */
import type { AvailableResult } from '@capgo/capacitor-native-biometric';

/** Stored in `settings.lock.credentialId` to mark a native biometric credential. */
export const NATIVE_BIOMETRIC_SENTINEL = 'native-biometric';

export type NativeBiometryType =
  | 'none'
  | 'touchId'
  | 'faceId'
  | 'fingerprint'
  | 'face'
  | 'iris'
  | 'multiple'
  | 'deviceCredential';

export type NativePlatformName = 'android' | 'ios' | 'web';

export interface NativeBiometricInfo {
  /** True only inside the Capacitor Android/iOS shell. */
  native: boolean;
  /** True when enrolled biometrics (no PIN fallback) are available. */
  available: boolean;
  biometryType: NativeBiometryType;
  labelAr: string;
  labelEn: string;
  strong: boolean;
  deviceIsSecure: boolean;
}

export interface NativeBiometricPromptOptions {
  /** Defaults to Arabic so the Android prompt matches the app language. */
  title?: string;
  subtitle?: string;
  description?: string;
  negativeButtonText?: string;
  /** Android allows 1–5; defaults to 3. */
  maxAttempts?: number;
}

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function bridge(): CapacitorBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
}

/** `android`, `ios` or `web` — safe to call in the browser and during SSR. */
export function nativePlatformName(): NativePlatformName {
  const capacitor = bridge();
  if (!capacitor) return 'web';
  try {
    if (typeof capacitor.getPlatform === 'function') {
      const platform = capacitor.getPlatform();
      if (platform === 'android' || platform === 'ios' || platform === 'web') return platform;
    }
    if (typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform()) return 'android';
  } catch {
    /* fall through */
  }
  return 'web';
}

/** True only inside the Capacitor Android/iOS shell (never in the PWA). */
export function isNativePlatform(): boolean {
  const capacitor = bridge();
  if (!capacitor) return false;
  try {
    if (typeof capacitor.isNativePlatform === 'function') return capacitor.isNativePlatform();
    const platform = nativePlatformName();
    return platform === 'android' || platform === 'ios';
  } catch {
    return false;
  }
}

/** BiometryType numeric values from the plugin (kept local to avoid a runtime import). */
const BIOMETRY_TYPE_VALUES: Record<NativeBiometryType, number> = {
  none: 0,
  touchId: 1,
  faceId: 2,
  fingerprint: 3,
  face: 4,
  iris: 5,
  multiple: 6,
  deviceCredential: 7
};

const BIOMETRY_LABELS: Record<NativeBiometryType, { ar: string; en: string }> = {
  none: { ar: 'غير متاحة', en: 'Unavailable' },
  touchId: { ar: 'بصمة الإصبع (Touch ID)', en: 'Touch ID' },
  faceId: { ar: 'التعرف على الوجه (Face ID)', en: 'Face ID' },
  fingerprint: { ar: 'بصمة الإصبع', en: 'Fingerprint' },
  face: { ar: 'التعرف على الوجه', en: 'Face unlock' },
  iris: { ar: 'قزحية العين', en: 'Iris' },
  multiple: { ar: 'بصمة متعددة (إصبع/وجه)', en: 'Multiple (fingerprint/face)' },
  deviceCredential: { ar: 'قفل الجهاز', en: 'Device credential' }
};

/** Native prompt strings follow the app language (document.documentElement.lang). */
const NATIVE_PROMPTS: Record<'ar' | 'en' | 'ckb' | 'fa', { title: string; subtitle: string; description: string; cancel: string }> = {
  ar: { title: 'فتح التطبيق', subtitle: 'واتساب المباشر', description: 'أكّد هويتك بالبصمة للمتابعة.', cancel: 'إلغاء' },
  en: { title: 'Unlock app', subtitle: 'Direct WhatsApp', description: 'Confirm your identity with biometrics to continue.', cancel: 'Cancel' },
  ckb: { title: 'کردنەوەی ئەپ', subtitle: 'واتساب ڕاستەوخۆ', description: 'ناسنامەت بە پەنجەمۆر پشتڕاست بکەرەوە بۆ بەردەوامبوون.', cancel: 'هەڵوەشاندنەوە' },
  fa: { title: 'باز کردن برنامه', subtitle: 'واتساپ مستقیم', description: 'برای ادامه، هویت خود را با اثر انگشت تأیید کنید.', cancel: 'لغو' }
};

function nativePrompt() {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : 'ar';
  return NATIVE_PROMPTS[(lang === 'en' || lang === 'ckb' || lang === 'fa' ? lang : 'ar') as keyof typeof NATIVE_PROMPTS];
}

function mapBiometryType(value: number | undefined): NativeBiometryType {
  const entry = Object.entries(BIOMETRY_TYPE_VALUES).find(([, code]) => code === value);
  return (entry?.[0] as NativeBiometryType | undefined) ?? 'none';
}

let pluginPromise: Promise<typeof import('@capgo/capacitor-native-biometric')> | null = null;

function loadPlugin(): Promise<typeof import('@capgo/capacitor-native-biometric')> {
  pluginPromise ??= import('@capgo/capacitor-native-biometric');
  return pluginPromise;
}

const UNAVAILABLE: NativeBiometricInfo = {
  native: false,
  available: false,
  biometryType: 'none',
  labelAr: BIOMETRY_LABELS.none.ar,
  labelEn: BIOMETRY_LABELS.none.en,
  strong: false,
  deviceIsSecure: false
};

/**
 * Detailed native biometric availability (type + strength) for Settings and the
 * diagnostics report. Returns an "unavailable" object on the web.
 */
export async function getNativeBiometricsInfo(): Promise<NativeBiometricInfo> {
  if (!isNativePlatform()) return UNAVAILABLE;
  try {
    const { NativeBiometric } = await loadPlugin();
    const result: AvailableResult = await NativeBiometric.isAvailable({
      useFallback: false,
      preferMultipleBiometryType: true
    });
    const biometryType = mapBiometryType(result.biometryType);
    const labels = BIOMETRY_LABELS[biometryType];
    return {
      native: true,
      available: Boolean(result.isAvailable),
      biometryType: result.isAvailable ? biometryType : 'none',
      labelAr: result.isAvailable ? labels.ar : BIOMETRY_LABELS.none.ar,
      labelEn: result.isAvailable ? labels.en : BIOMETRY_LABELS.none.en,
      strong: Boolean(result.strongBiometryIsAvailable),
      deviceIsSecure: Boolean(result.deviceIsSecure)
    };
  } catch {
    return { ...UNAVAILABLE, native: true };
  }
}

/** True when native biometrics are enrolled and usable (PIN fallback excluded). */
export async function isNativeBiometricsAvailable(): Promise<boolean> {
  const info = await getNativeBiometricsInfo();
  return info.native && info.available;
}

/**
 * Native enrollment check: shows the system biometric prompt once and returns
 * the sentinel credential id on success. No secret is stored — the OS prompt is
 * the gate, and the PIN hash stays the permanent fallback.
 */
export async function registerNativeBiometric(): Promise<string | null> {
  if (!(await isNativeBiometricsAvailable())) return null;
  const verified = await verifyNativeBiometric();
  return verified ? NATIVE_BIOMETRIC_SENTINEL : null;
}

/**
 * Ask the OS to verify the user with biometrics.
 * Arabic title/description by default, `إلغاء` as the negative button and a
 * maximum of 3 attempts (Android clamps 1–5).
 */
export async function verifyNativeBiometric(options: NativeBiometricPromptOptions = {}): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { NativeBiometric } = await loadPlugin();
    const maxAttempts = Math.min(5, Math.max(1, Math.round(options.maxAttempts ?? 3)));
    const prompt = nativePrompt();
    await NativeBiometric.verifyIdentity({
      title: options.title ?? prompt.title,
      subtitle: options.subtitle ?? prompt.subtitle,
      description: options.description ?? prompt.description,
      negativeButtonText: options.negativeButtonText ?? prompt.cancel,
      maxAttempts
    });
    return true;
  } catch {
    // User cancelled, failed the check, or the sensor is locked out.
    return false;
  }
}
