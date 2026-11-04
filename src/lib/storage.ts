export interface StorageInfo {
  supported: boolean;
  usage: number;
  quota: number;
  persisted: boolean;
  /** 0–100 when a quota is known, otherwise null. */
  percent: number | null;
}

const EMPTY: StorageInfo = { supported: false, usage: 0, quota: 0, persisted: false, percent: null };

function isNativeBridge(): boolean {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return Boolean(capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const native = isNativeBridge();
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    // The Android WebView may not implement StorageManager; app-private
    // storage in the APK is not evicted like a browser origin, so it is
    // reported as persistent instead of showing a broken "not protected" state.
    return native ? { ...EMPTY, supported: true, persisted: true } : EMPTY;
  }
  try {
    const [estimate, persisted] = await Promise.all([
      navigator.storage.estimate(),
      navigator.storage.persisted?.().catch(() => false) ?? Promise.resolve(false)
    ]);
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    return {
      supported: true,
      usage,
      quota,
      // Android app-private storage persists until the user uninstalls or
      // clears the app; there is no browser eviction to opt out of.
      persisted: native || Boolean(persisted),
      percent: quota > 0 ? Math.min(100, Math.round((usage / quota) * 100)) : null
    };
  } catch {
    return native ? { ...EMPTY, supported: true, persisted: true } : EMPTY;
  }
}

/** Ask the browser to keep this origin's storage (eviction protection). */
export async function requestPersistentStorage(): Promise<boolean> {
  if (isNativeBridge()) return true;
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Called once at boot; never blocks the UI. */
export async function ensurePersistentStorage(): Promise<void> {
  if (isNativeBridge()) return;
  try {
    const info = await getStorageInfo();
    if (info.supported && !info.persisted) await requestPersistentStorage();
  } catch {
    /* optional capability */
  }
}
