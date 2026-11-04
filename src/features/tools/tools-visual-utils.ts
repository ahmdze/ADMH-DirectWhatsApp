import { dataUrlToBlob, downloadBlob, readFileAsDataUrl, shareFiles } from '../../lib/image';
import { formatPhone } from '../../lib/phone';
import type { Destination, Target } from '../../types';

/** Build a File from an image data URL, ready for `navigator.share`. */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const blob = dataUrlToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

/** Download an image data URL without leaving a dangling object URL. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  downloadBlob(dataUrlToBlob(dataUrl), filename);
}

export function downloadSvg(svg: string, filename: string): void {
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

/** Share an image through the Web Share API. Returns false when unsupported. */
export async function shareImageDataUrl(dataUrl: string, filename: string, data: ShareData = {}): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false;
  return shareFiles([dataUrlToFile(dataUrl, filename)], data);
}

/** Turn arbitrary labels into a safe cross-platform file base name. */
export function safeFileBase(input: string, fallback: string): string {
  const cleaned = (input || '')
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return cleaned || fallback;
}

export type ImageReadResult = { ok: true; dataUrl: string } | { ok: false; reason: 'type' | 'size' | 'read' };

/** Read a user-picked image while enforcing a type/size budget. */
export async function readImageFileAsDataUrl(file: File, maxBytes = 2 * 1024 * 1024): Promise<ImageReadResult> {
  if (!file.type.startsWith('image/')) return { ok: false, reason: 'type' };
  if (file.size > maxBytes || file.size === 0) return { ok: false, reason: 'size' };
  try {
    return { ok: true, dataUrl: await readFileAsDataUrl(file) };
  } catch {
    return { ok: false, reason: 'read' };
  }
}

/** Convert a saved destination into a `Target` (or null when its data is broken). */
export function destinationToTarget(destination: Destination): Target | null {
  if (destination.type === 'username') {
    const value = (destination.username || destination.label).replace(/^@/, '').trim();
    if (!/^[A-Za-z0-9._-]{3,64}$/.test(value)) return null;
    return { type: 'username', value, display: '@' + value };
  }
  const value = (destination.phone || '').replace(/\D/g, '');
  if (!value) return null;
  return { type: 'phone', value, display: formatPhone(value) };
}

/** Escape user text before injecting it into a generated print document. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
