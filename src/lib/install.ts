import { useSyncExternalStore } from 'react';
import { isIos, isStandalone } from './format';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallState {
  canInstall: boolean;
  installed: boolean;
  ios: boolean;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
let cached: InstallState = { canInstall: false, installed: false, ios: false };
const listeners = new Set<() => void>();

function refresh(): void {
  cached = { canInstall: Boolean(deferred), installed, ios: isIos() };
}

function snapshot(): InstallState {
  return cached;
}

function emit(): void {
  refresh();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  installed = isStandalone();
  refresh();
  const onPrompt = (event: Event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  };
  const onInstalled = () => {
    installed = true;
    deferred = null;
    emit();
  };
  window.addEventListener('beforeinstallprompt', onPrompt);
  window.addEventListener('appinstalled', onInstalled);
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', (event) => {
    installed = event.matches;
    emit();
  });
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  try {
    await deferred.prompt();
    const choice = await deferred.userChoice;
    deferred = null;
    emit();
    return choice.outcome;
  } catch {
    return 'unavailable';
  }
}

/* ------------------------------------------------------------------ online */

let online = typeof navigator === 'undefined' ? true : navigator.onLine;
const onlineListeners = new Set<() => void>();

function emitOnline(): void {
  onlineListeners.forEach((listener) => listener());
}

function subscribeOnline(listener: () => void): () => void {
  onlineListeners.add(listener);
  return () => onlineListeners.delete(listener);
}

function onlineSnapshot(): boolean {
  return online;
}

export function initOnlineWatcher(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    online = true;
    emitOnline();
  });
  window.addEventListener('offline', () => {
    online = false;
    emitOnline();
  });
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, onlineSnapshot, onlineSnapshot);
}
