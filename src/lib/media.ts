/**
 * Session-only media attachments for Compose.
 *
 * Files are never written to Dexie or backups. Images are compressed locally
 * (WebP, max 1600px, quality 0.85, 2MB target, JPEG fallback) and every file
 * is shared through the system share sheet; WhatsApp cannot pre-select a chat
 * for media, so the UI states this explicitly.
 */
import { uid } from './format';

export const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024;
export const MAX_FILE_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 1600;
export const MAX_IMAGE_OUTPUT_BYTES = 2 * 1024 * 1024;

export type MediaKind = 'image' | 'file' | 'vcard';

export interface MediaAttachment {
  id: string;
  file: File;
  url: string;
  kind: MediaKind;
  name: string;
  size: number;
  mime: string;
}

export type MediaError = 'empty' | 'too-large' | 'unsupported';

const ALLOWED_DOCUMENT = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'text/vcard'
]);

export function validateMediaFile(file: File): MediaError | null {
  if (!file || !file.size) return 'empty';
  const image = file.type.startsWith('image/');
  if (!image && !ALLOWED_DOCUMENT.has(file.type)) return 'unsupported';
  if (file.size > (image ? MAX_IMAGE_INPUT_BYTES : MAX_FILE_INPUT_BYTES)) return 'too-large';
  return null;
}

export function mediaKind(file: File): MediaKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'text/vcard') return 'vcard';
  return 'file';
}

function renamedFile(blob: Blob, name: string): File {
  const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/jpeg' ? 'jpg' : 'img';
  const base = name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${base}.${extension}`, { type: blob.type, lastModified: Date.now() });
}

async function encodeCanvas(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  return blob && blob.type ? blob : null;
}

/** Downscale and compress an image locally; returns the original on failure. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);

    let blob = await encodeCanvas(canvas, 'image/webp', 0.85);
    if (!blob) blob = await encodeCanvas(canvas, 'image/jpeg', 0.85);
    if (blob && blob.size > MAX_IMAGE_OUTPUT_BYTES) {
      blob = await encodeCanvas(canvas, 'image/jpeg', 0.7) ?? blob;
    }
    return blob ? renamedFile(blob, file.name) : file;
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

export function releaseMedia(items: MediaAttachment[]): void {
  for (const item of items) {
    try {
      URL.revokeObjectURL(item.url);
    } catch {
      /* ignore */
    }
  }
}

export async function prepareMediaFile(file: File): Promise<MediaAttachment> {
  const error = validateMediaFile(file);
  if (error) throw new Error(error);
  const prepared = await compressImage(file);
  return {
    id: uid(),
    file: prepared,
    url: URL.createObjectURL(prepared),
    kind: mediaKind(prepared),
    name: prepared.name,
    size: prepared.size,
    mime: prepared.type || 'application/octet-stream'
  };
}
