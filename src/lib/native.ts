/**
 * Capacitor native bridge helpers.
 *
 * The app ships as both a PWA and a Capacitor Android app. Everything native is
 * loaded lazily (`await import('@capacitor/...')`) so the web bundle never pulls
 * plugin code, and every helper has a web-safe default. `isNative()` only reads
 * the tiny `window.Capacitor` bridge object that Capacitor injects.
 */
import { getSettings } from './settings';
import { isSessionUnlocked } from './lock';
import { navigate } from './router';
import { setDraft } from './launch';
import { extractCandidateFromText } from './phone';

type NativePlatform = 'android' | 'ios' | 'web';

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => NativePlatform;
}

const KNOWN_ROUTE = /^\/(compose|targets|templates|tools|settings)(\/|$)/;
const ROOT_ROUTES = new Set(['/compose', '/targets', '/templates', '/tools']);
const SHARED_TEXT_KEYS = ['text', 'message', 'url', 'title'] as const;

function bridge(): CapacitorBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
}

/** `android`, `ios` or `web` — safe to call on the server/browser. */
export function nativePlatform(): NativePlatform {
  const capacitor = bridge();
  if (!capacitor) return 'web';
  try {
    if (typeof capacitor.getPlatform === 'function') return capacitor.getPlatform();
    if (typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform()) return 'android';
  } catch {
    /* fall through */
  }
  return 'web';
}

/** True only inside the Capacitor Android/iOS shell. */
export function isNative(): boolean {
  const capacitor = bridge();
  if (!capacitor) return false;
  try {
    if (typeof capacitor.isNativePlatform === 'function') return capacitor.isNativePlatform();
    const platform = nativePlatform();
    return platform === 'android' || platform === 'ios';
  } catch {
    return false;
  }
}

/* --------------------------------------------------------------- lifecycle */

let initPromise: Promise<void> | null = null;

/**
 * Wire up the Android back button, deep links and notification taps.
 * Idempotent; resolves immediately (and does nothing) on the web.
 * Called once from `lib/notifications.ts` because `main.tsx`/`App.tsx` are owned
 * by the app shell, not this module.
 */
export function initNative(): Promise<void> {
  if (!isNative()) return Promise.resolve();
  if (!initPromise) initPromise = setupNative();
  return initPromise;
}

async function setupNative(): Promise<void> {
  try {
    await whenNativeReady();
    const { App } = await import('@capacitor/app');

    const launchUrl = await App.getLaunchUrl();
    if (launchUrl?.url) handleDeepLink(launchUrl.url);
    await App.addListener('appUrlOpen', (event) => handleDeepLink(event.url));
    await App.addListener('backButton', () => handleNativeBack());

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const extra = action.notification.extra as { source?: string } | undefined;
        if (extra?.source === 'admh-reminder' || extra?.source === 'admh-due') navigate('/tools/reminders');
      });
    } catch {
      /* notifications plugin unavailable — ignore */
    }
  } catch {
    /* Native bridge not ready (or running in a plain browser): keep the web app alive. */
  }
}

/** Wait for Capacitor's bridge without hanging if `deviceready` already fired. */
function whenNativeReady(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    document.addEventListener('deviceready', finish, { once: true });
    if (document.readyState === 'complete') window.setTimeout(finish, 0);
    else window.addEventListener('load', finish, { once: true });
    window.setTimeout(finish, 3000);
  });
}

function currentPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  const path = (hash.split('?')[0] || '/compose').trim();
  return path.startsWith('/') ? path : `/${path}`;
}

function handleNativeBack(): void {
  const path = currentPath();
  // While the lock screen is up the back button should not bypass it: send the
  // app to the background instead of exiting (the session stays locked).
  if (getSettings().lock.enabled && !isSessionUnlocked()) {
    void minimizeNativeApp();
    return;
  }
  if (!ROOT_ROUTES.has(path)) {
    if (window.history.length > 1) window.history.back();
    else navigate('/compose');
    return;
  }
  void exitNativeApp();
}

async function minimizeNativeApp(): Promise<void> {
  try {
    const { App } = await import('@capacitor/app');
    await App.minimizeApp();
  } catch {
    /* ignore */
  }
}

async function exitNativeApp(): Promise<void> {
  try {
    const { App } = await import('@capacitor/app');
    await App.exitApp();
  } catch {
    /* ignore */
  }
}

/* ---------------------------------------------------------------- deep links */

interface ParsedDeepLink {
  route: string;
  params: URLSearchParams;
}

function parseDeepLink(rawUrl: string): ParsedDeepLink | null {
  try {
    const url = new URL(rawUrl);
    const hash = url.hash.replace(/^#/, '');
    const [hashPath = '', hashQuery = ''] = hash.split('?');
    const params = new URLSearchParams(url.search);
    new URLSearchParams(hashQuery).forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
    const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
    let rawRoute = '';
    if (hashPath) rawRoute = hashPath;
    else if (!isHttp && url.host) rawRoute = `/${url.host}${url.pathname === '/' ? '' : url.pathname}`;
    else if (url.pathname && url.pathname !== '/') rawRoute = url.pathname;
    rawRoute = rawRoute.trim();
    const route = rawRoute ? (rawRoute.startsWith('/') ? rawRoute : `/${rawRoute}`) : '';
    return { route, params };
  } catch {
    return null;
  }
}

/**
 * Minimal deep-link handling:
 *   com.admh.directwhatsapp://compose?text=...
 *   admh://tools/scan
 *   <app>://?action=scan
 *   https://<host>/#/compose?phone=964...
 */
export function handleDeepLink(rawUrl: string): void {
  const parsed = parseDeepLink(rawUrl);
  if (!parsed) return;
  const { route, params } = parsed;

  if (route && KNOWN_ROUTE.test(route)) navigate(route);

  const action = params.get('action');
  if (action === 'scan') {
    navigate('/tools/scan');
    return;
  }

  const sharedText = SHARED_TEXT_KEYS.map((key) => params.get(key) || '')
    .filter(Boolean)
    .join('\n')
    .trim();
  const explicitTarget = params.get('phone') || params.get('number') || params.get('target') || '';

  if (action !== 'compose' && !sharedText && !explicitTarget) return;

  const candidate = explicitTarget || (sharedText ? extractCandidateFromText(sharedText) : null) || '';
  const message = params.get('message') || params.get('text') || undefined;
  setDraft({
    raw: candidate,
    message: message && candidate && message.includes(candidate) ? undefined : message,
    origin: 'share'
  });
  navigate('/compose');
}

/* ------------------------------------------------------------ save & share */

function safeFileName(name: string): string {
  const cleaned = (name || 'file').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 120) || 'file';
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

async function blobToBase64(blob: Blob): Promise<string> {
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
}

type NativeDirectory = 'documents' | 'cache';

async function writeNativeFile(blob: Blob, filename: string, directory: NativeDirectory): Promise<string | null> {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const data = await blobToBase64(blob);
    const path = `admh/${safeFileName(filename)}`;
    const target = directory === 'documents' ? Directory.Documents : Directory.Cache;
    await Filesystem.writeFile({ path, data, directory: target, recursive: true });
    const { uri } = await Filesystem.getUri({ path, directory: target });
    return uri;
  } catch {
    return null;
  }
}

async function shareNativeUris(uris: string[], title?: string, text?: string): Promise<boolean> {
  try {
    const { Share } = await import('@capacitor/share');
    await Share.share({ title, text, files: uris, dialogTitle: title });
    return true;
  } catch {
    return false;
  }
}

export interface SaveNativeFileOptions {
  /** `documents` keeps the file; `cache` is meant for immediate sharing. */
  directory?: NativeDirectory;
  /** Open the Android share sheet so the user can pick where to keep the file. */
  share?: boolean;
}

/**
 * Save a blob with the native filesystem.
 *
 * When sharing is requested (the default) the file is written to the cache
 * first and offered through the native share sheet; if no app can receive it we
 * keep a copy in the app's documents directory instead. Returns false on the web
 * or when nothing could be written.
 */
export async function saveNativeFile(blob: Blob, filename: string, options: SaveNativeFileOptions = {}): Promise<boolean> {
  if (!isNative()) return false;
  if (options.share === false) {
    return Boolean(await writeNativeFile(blob, filename, options.directory ?? 'documents'));
  }
  const cacheUri = await writeNativeFile(blob, filename, 'cache');
  if (cacheUri && (await shareNativeUris([cacheUri], filename))) return true;
  return Boolean(await writeNativeFile(blob, filename, options.directory ?? 'documents'));
}

/** Share one or more files through the native share sheet. */
export async function shareNativeFiles(files: File[], data: { title?: string; text?: string } = {}): Promise<boolean> {
  if (!isNative() || !files.length) return false;
  const uris: string[] = [];
  for (const file of files) {
    const uri = await writeNativeFile(file, file.name || 'file', 'cache');
    if (uri) uris.push(uri);
  }
  if (!uris.length) return false;
  return shareNativeUris(uris, data.title, data.text);
}

/** Share plain text through the native share sheet. */
export async function shareNativeText(text: string, title?: string): Promise<boolean> {
  if (!isNative() || !text.trim()) return false;
  try {
    const { Share } = await import('@capacitor/share');
    await Share.share({ title, text, dialogTitle: title });
    return true;
  } catch {
    return false;
  }
}
