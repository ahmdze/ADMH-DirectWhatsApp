import { registerPlugin } from '@capacitor/core';
import { isNative } from './native';
import type { Locale } from '../types';

interface AppLocalePlugin {
  setLocale(options: { locale: string }): Promise<void>;
}

const plugin = registerPlugin<AppLocalePlugin>('AppLocale');

/**
 * Mirror the in-app language to Android's per-app locale so the launcher label
 * can use the matching localized app_name resource. The icon itself is shared;
 * icons are not locale-qualified on Android.
 */
export async function syncAppLocale(locale: Locale): Promise<void> {
  if (!isNative()) return;
  try {
    await plugin.setLocale({ locale });
  } catch {
    /* Older WebViews/plugins may not expose the bridge; the app still works. */
  }
}
