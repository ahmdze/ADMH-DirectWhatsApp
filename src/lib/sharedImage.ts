const SHARE_CACHE = 'admh-share-target';
const SHARE_KEY = '__shared-image';

function shareUrl(): string {
  return new URL(SHARE_KEY, document.baseURI).href;
}

/** Read (and consume) an image shared into the app via the Web Share Target API. */
export async function takeSharedImage(): Promise<File | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(SHARE_CACHE);
    const response = await cache.match(shareUrl());
    if (!response) return null;
    await cache.delete(shareUrl());
    const blob = await response.blob();
    if (!blob.size) return null;
    const name = decodeURIComponent(response.headers.get('X-File-Name') || 'shared-image.png');
    return new File([blob], name, { type: blob.type || 'image/png' });
  } catch {
    return null;
  }
}

export async function hasSharedImage(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open(SHARE_CACHE);
    return Boolean(await cache.match(shareUrl()));
  } catch {
    return false;
  }
}
