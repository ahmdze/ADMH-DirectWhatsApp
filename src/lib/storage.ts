export interface StorageInfo {
  supported: boolean;
  usage: number;
  quota: number;
  persisted: boolean;
  /** 0–100 when a quota is known, otherwise null. */
  percent: number | null;
}

const EMPTY: StorageInfo = { supported: false, usage: 0, quota: 0, persisted: false, percent: null };

export async function getStorageInfo(): Promise<StorageInfo> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return EMPTY;
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
      persisted: Boolean(persisted),
      percent: quota > 0 ? Math.min(100, Math.round((usage / quota) * 100)) : null
    };
  } catch {
    return EMPTY;
  }
}

/** Ask the browser to keep this origin's storage (eviction protection). */
export async function requestPersistentStorage(): Promise<boolean> {
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
  try {
    const info = await getStorageInfo();
    if (info.supported && !info.persisted) await requestPersistentStorage();
  } catch {
    /* optional capability */
  }
}
