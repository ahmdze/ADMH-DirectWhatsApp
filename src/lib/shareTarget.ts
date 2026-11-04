import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { extractCandidateFromText } from './phone';
import { setDraft } from './launch';
import { navigate } from './router';
import { isNative } from './native';
import { setSharedFiles } from './sharedFiles';

interface NativeSharePayload {
  id?: string;
  text?: string;
  subject?: string;
  mimeType?: string;
  files?: string[];
}

interface ShareTargetPlugin {
  getPending(): Promise<NativeSharePayload | undefined>;
  addListener(eventName: 'shareReceived', listener: (payload: NativeSharePayload) => void): Promise<PluginListenerHandle>;
}

const seen = new Set<string>();
let started = false;
let listener: PluginListenerHandle | null = null;

function base64ToBlob(data: string, mime: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

function mimeFor(name: string, fallback: string): string {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'pdf') return 'application/pdf';
  return fallback || 'application/octet-stream';
}

async function handlePayload(payload: NativeSharePayload): Promise<void> {
  if (!payload) return;
  const id = payload.id || `${payload.text || ''}:${(payload.files || []).join(',')}`;
  if (seen.has(id)) return;
  seen.add(id);
  if (seen.size > 20) seen.delete(seen.values().next().value as string);

  const text = (payload.text || payload.subject || '').trim();
  const candidate = text ? extractCandidateFromText(text) || '' : '';
  const files: File[] = [];

  for (const name of payload.files || []) {
    try {
      const result = await Filesystem.readFile({ path: `shared/${name}`, directory: Directory.Cache });
      if (typeof result.data !== 'string') continue;
      const mime = mimeFor(name, payload.mimeType || '');
      files.push(new File([base64ToBlob(result.data, mime)], name, { type: mime }));
    } catch {
      /* The cache file may already be gone; ignore it. */
    }
  }

  if (!text && !files.length) return;
  if (files.length) setSharedFiles(files);
  setDraft({
    raw: candidate,
    message: text && candidate && text.includes(candidate) ? undefined : text || undefined,
    origin: 'share'
  });
  navigate('/compose');
}

/**
 * Register the Android ACTION_SEND bridge. Called once after the app boots.
 * Text-only shares become a normal Draft; files are read from the plugin's
 * cache directory and attached to Compose for the current session.
 */
export async function initShareTarget(): Promise<void> {
  if (!isNative() || started) return;
  started = true;
  try {
    const plugin = registerPlugin<ShareTargetPlugin>('ShareTarget');
    listener = await plugin.addListener('shareReceived', (payload) => {
      void handlePayload(payload);
    });
    const pending = await plugin.getPending();
    if (pending) await handlePayload(pending);
  } catch {
    /* The native plugin is only present in the Android build. */
  }
}

export function stopShareTarget(): void {
  void listener?.remove();
  listener = null;
  started = false;
}
