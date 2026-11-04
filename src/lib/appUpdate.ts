/**
 * In-app update checker for the Capacitor Android build.
 *
 * The app is distributed as an APK through GitHub Releases (no Play Store), so
 * it cannot rely on the browser's PWA update flow. This module asks the GitHub
 * Releases API for the latest published release, compares it with the bundled
 * `APP_VERSION` and returns the APK download link.
 *
 * Rules that keep it cheap and quiet:
 * - Never touches the network on the web (only inside the native shell).
 * - One request at most every 6 hours (`localStorage` cache).
 * - A failed request silently falls back to the last cached result.
 * - Pre-releases / drafts are ignored entirely.
 */
import { APP_VERSION } from './changelog';
import { isNative } from './native';

const RELEASES_API = 'https://api.github.com/repos/ahmdze/ADMH-DirectWhatsApp/releases/latest';
const RELEASES_PAGE = 'https://github.com/ahmdze/ADMH-DirectWhatsApp/releases/latest';

const CACHE_KEY = 'admh2_app_update_cache_v1';
const DISMISSED_KEY = 'admh2_app_update_dismissed_v1';

/** How long a successful check is considered fresh. */
export const UPDATE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
/** Hard timeout for the GitHub request. */
export const UPDATE_REQUEST_TIMEOUT_MS = 8000;

export interface AppUpdateInfo {
  /** Version bundled in this build (e.g. `2.3.2`). */
  currentVersion: string;
  /** Latest non-prerelease release, without the leading `v`. */
  latestVersion: string;
  updateAvailable: boolean;
  /** Direct `.apk` asset URL, or `null` when the release has no APK attached. */
  apkUrl: string | null;
  /** GitHub release page (fallback download target). */
  releaseUrl: string;
  publishedAt: string | null;
  /** Result came from the 6-hour cache. */
  cached: boolean;
  /** Network failed and this is the last cached result. */
  stale: boolean;
}

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface CheckForAppUpdateOptions {
  /** Bypass the 6-hour cache (used by manual checks). */
  force?: boolean;
}

interface CachedRelease {
  checkedAt: number;
  latestVersion: string;
  apkUrl: string | null;
  releaseUrl: string;
  publishedAt: string | null;
}

interface GitHubAssetLike {
  name?: unknown;
  browser_download_url?: unknown;
}

interface GitHubReleaseLike {
  tag_name?: unknown;
  html_url?: unknown;
  published_at?: unknown;
  prerelease?: unknown;
  draft?: unknown;
  assets?: unknown;
}

/* --------------------------------------------------------------- versions */

/**
 * Parse a loose semantic version (`v2.3.10`, `2.3`, `2.3.10+build`).
 * Pre-release suffixes are not part of the numeric comparison.
 */
export function parseVersion(value: string): SemanticVersion | null {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i.exec(String(value ?? '').trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
    patch: Number(match[3] ?? 0)
  };
}

/**
 * Compare two versions numerically.
 * Returns `1` when `a` is newer, `-1` when older and `0` when equal or when
 * either side cannot be parsed as a version.
 */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  if (left.major !== right.major) return left.major > right.major ? 1 : -1;
  if (left.minor !== right.minor) return left.minor > right.minor ? 1 : -1;
  if (left.patch !== right.patch) return left.patch > right.patch ? 1 : -1;
  return 0;
}

/** `true` when `latest` is strictly newer than `current`. */
export function isVersionNewer(latest: string, current: string): boolean {
  return compareVersions(latest, current) > 0;
}

/** Semver pre-release tags (`2.3.3-beta.1`) are never offered. */
function isPrereleaseTag(tag: string): boolean {
  return tag.includes('-');
}

function normalizeVersion(tag: string): string {
  const withoutPrefix = tag.trim().replace(/^v/i, '');
  return withoutPrefix.split('+')[0].trim();
}

/* ------------------------------------------------------------------ storage */

function readStorage(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage disabled or full — updates are non-critical */
  }
}

function readCache(): CachedRelease | null {
  const text = readStorage(CACHE_KEY);
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as Record<string, unknown>;
    const checkedAt = typeof value.checkedAt === 'number' && Number.isFinite(value.checkedAt) ? value.checkedAt : 0;
    const latestVersion = typeof value.latestVersion === 'string' ? normalizeVersion(value.latestVersion) : '';
    if (!checkedAt || !latestVersion) return null;
    return {
      checkedAt,
      latestVersion,
      apkUrl: typeof value.apkUrl === 'string' && value.apkUrl ? value.apkUrl : null,
      releaseUrl: typeof value.releaseUrl === 'string' && value.releaseUrl ? value.releaseUrl : RELEASES_PAGE,
      publishedAt: typeof value.publishedAt === 'string' ? value.publishedAt : null
    };
  } catch {
    return null;
  }
}

function writeCache(release: CachedRelease): void {
  writeStorage(CACHE_KEY, JSON.stringify(release));
}

/* ------------------------------------------------------------------- fetch */

function parseRelease(payload: unknown): CachedRelease | null {
  if (!payload || typeof payload !== 'object') return null;
  const release = payload as GitHubReleaseLike;
  if (release.prerelease === true || release.draft === true) return null;

  const tag = typeof release.tag_name === 'string' ? release.tag_name.trim() : '';
  if (!tag || isPrereleaseTag(tag.replace(/^v/i, ''))) return null;
  const latestVersion = normalizeVersion(tag);
  if (!latestVersion || !parseVersion(latestVersion)) return null;

  let apkUrl: string | null = null;
  const assets = Array.isArray(release.assets) ? release.assets : [];
  for (const asset of assets) {
    const item = asset as GitHubAssetLike;
    const name = typeof item.name === 'string' ? item.name : '';
    const url = typeof item.browser_download_url === 'string' ? item.browser_download_url : '';
    if (!url.startsWith('https://') || !name.toLowerCase().endsWith('.apk')) continue;
    apkUrl = url;
    break;
  }

  const htmlUrl = typeof release.html_url === 'string' && release.html_url.startsWith('https://') ? release.html_url : RELEASES_PAGE;

  return {
    checkedAt: Date.now(),
    latestVersion,
    apkUrl,
    releaseUrl: htmlUrl,
    publishedAt: typeof release.published_at === 'string' ? release.published_at : null
  };
}

async function fetchLatestRelease(): Promise<CachedRelease | null> {
  if (typeof fetch !== 'function') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPDATE_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(RELEASES_API, {
      method: 'GET',
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
      signal: controller.signal
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return parseRelease(payload);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* --------------------------------------------------------------------- api */

function toInfo(release: CachedRelease, flags: { cached: boolean; stale: boolean }): AppUpdateInfo {
  return {
    currentVersion: APP_VERSION,
    latestVersion: release.latestVersion,
    updateAvailable: isVersionNewer(release.latestVersion, APP_VERSION),
    apkUrl: release.apkUrl,
    releaseUrl: release.releaseUrl,
    publishedAt: release.publishedAt,
    cached: flags.cached,
    stale: flags.stale
  };
}

/** True only inside the Capacitor shell — the web build never checks for APKs. */
export function isUpdateCheckSupported(): boolean {
  return isNative();
}

/**
 * Check GitHub Releases for a newer APK.
 *
 * Returns `null` on the web, when the request fails with no cached result, or
 * when the latest release is a pre-release. Never throws.
 */
export async function checkForAppUpdate(options: CheckForAppUpdateOptions = {}): Promise<AppUpdateInfo | null> {
  if (!isUpdateCheckSupported()) return null;

  const cached = readCache();
  if (cached && !options.force && Date.now() - cached.checkedAt < UPDATE_CACHE_TTL_MS) {
    return toInfo(cached, { cached: true, stale: false });
  }

  const fresh = await fetchLatestRelease();
  if (fresh) {
    writeCache(fresh);
    return toInfo(fresh, { cached: false, stale: false });
  }

  return cached ? toInfo(cached, { cached: true, stale: true }) : null;
}

/** Version the user explicitly postponed (`null` when none). */
export function getDismissedUpdateVersion(): string | null {
  const value = readStorage(DISMISSED_KEY);
  return value && value.trim() ? normalizeVersion(value) : null;
}

/** Remember "later" for one version; a newer release can still be offered. */
export function dismissUpdateVersion(version: string): void {
  const clean = normalizeVersion(version);
  if (!clean) return;
  writeStorage(DISMISSED_KEY, clean);
}

/** Forget the postponed version (used when the user asks to check again). */
export function clearDismissedUpdateVersion(): void {
  writeStorage(DISMISSED_KEY, null);
}
