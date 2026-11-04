/**
 * Local-only feature flags for the v2.4 rollout.
 *
 * Alpha/Beta builds can ship features behind these flags without a server or
 * remote config. Flags are stored in localStorage and default to off, so a
 * bad feature can be disabled by the user/tester without downgrading the app
 * or touching IndexedDB.
 */
export type FeatureFlag =
  | 'schedulerV2'
  | 'mediaShare'
  | 'historyRetention'
  | 'localMetrics';

const STORAGE_KEY = 'admh2_feature_flags_v1';

const DEFAULTS: Record<FeatureFlag, boolean> = {
  schedulerV2: false,
  mediaShare: false,
  historyRetention: false,
  localMetrics: false
};

function readAll(): Record<FeatureFlag, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Record<FeatureFlag, unknown>>;
    return {
      schedulerV2: parsed.schedulerV2 === true,
      mediaShare: parsed.mediaShare === true,
      historyRetention: parsed.historyRetention === true,
      localMetrics: parsed.localMetrics === true
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  if (typeof localStorage === 'undefined') return DEFAULTS[flag];
  return readAll()[flag];
}

export function setFeatureEnabled(flag: FeatureFlag, enabled: boolean): void {
  try {
    const next = { ...readAll(), [flag]: enabled };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* flags are optional */
  }
}

export function getFeatureFlags(): Record<FeatureFlag, boolean> {
  return readAll();
}

declare global {
  interface Window {
    __setFeatureFlag?: (flag: FeatureFlag, enabled: boolean) => void;
    __getFeatureFlags?: () => Record<FeatureFlag, boolean>;
  }
}

if (typeof window !== 'undefined') {
  window.__setFeatureFlag = (flag, enabled) => setFeatureEnabled(flag, enabled);
  window.__getFeatureFlags = () => readAll();
}
