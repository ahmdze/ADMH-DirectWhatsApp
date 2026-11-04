import { isNative } from './native';

/**
 * Haptics helper.
 *
 * On Android/iOS (Capacitor) this uses the native Haptics plugin so the
 * feedback matches the platform conventions. In the browser it falls back to
 * the Vibration API (which is a no-op on iOS Safari).
 */

async function nativeHaptics() {
  return import('@capacitor/haptics');
}

export function vibrate(pattern: number | number[] = 12): void {
  if (isNative()) {
    const duration = Array.isArray(pattern) ? pattern.reduce((total, part) => total + part, 0) : pattern;
    void nativeHaptics()
      .then(({ Haptics }) => Haptics.vibrate({ duration }))
      .catch(() => undefined);
    return;
  }
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

export function hapticSuccess(): void {
  if (isNative()) {
    void nativeHaptics()
      .then(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Success }))
      .catch(() => undefined);
    return;
  }
  vibrate([10, 40, 12]);
}

export function hapticError(): void {
  if (isNative()) {
    void nativeHaptics()
      .then(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Error }))
      .catch(() => undefined);
    return;
  }
  vibrate([24, 60, 24]);
}

export function hapticTap(): void {
  if (isNative()) {
    void nativeHaptics()
      .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
      .catch(() => undefined);
    return;
  }
  vibrate(8);
}
