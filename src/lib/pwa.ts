import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface PwaState {
  needRefresh: boolean;
  offlineReady: boolean;
}

let state: PwaState = { needRefresh: false, offlineReady: false };
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): PwaState {
  return state;
}

let applyUpdate: (reloadPage?: boolean) => Promise<void> = async () => undefined;
let registrationRef: ServiceWorkerRegistration | null = null;

export function initPwa(): void {
  if (typeof window === 'undefined') return;
  try {
    applyUpdate = registerSW({
      immediate: true,
      onNeedRefresh() {
        state = { ...state, needRefresh: true };
        emit();
      },
      onOfflineReady() {
        state = { ...state, offlineReady: true };
        emit();
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        registrationRef = registration;
        window.setInterval(() => {
          void registration.update();
        }, 60 * 60 * 1000);
      }
    });
  } catch {
    /* PWA not available (e.g. dev without plugin) */
  }
}

/**
 * Manual "Check for updates" for the web/PWA build. Asks the active service
 * worker registration to check now; a waiting worker means a new version is
 * ready and the normal update banner is shown through `onNeedRefresh`.
 */
export async function checkForPwaUpdate(): Promise<boolean> {
  if (!registrationRef) return false;
  try {
    await registrationRef.update();
    return Boolean(registrationRef.waiting || registrationRef.installing);
  } catch {
    return false;
  }
}

export function usePwaState(): PwaState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export async function updateApp(): Promise<void> {
  state = { ...state, needRefresh: false };
  emit();
  await applyUpdate(true);
}

export function dismissUpdate(): void {
  state = { ...state, needRefresh: false };
  emit();
}

export function dismissOfflineReady(): void {
  state = { ...state, offlineReady: false };
  emit();
}
