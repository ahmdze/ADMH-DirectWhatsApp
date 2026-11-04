/**
 * Clipboard helpers with a native Capacitor path.
 *
 * Android WebView refuses `navigator.clipboard.readText()` unless the page is
 * focused and often returns an empty/denied result, which made "Paste" report
 * "no text in clipboard". The native Clipboard plugin reads the real system
 * clipboard; the web implementation below remains the fallback.
 */

function isNativeBridge(): boolean {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return Boolean(capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

async function loadNativeClipboard() {
  return import('@capacitor/clipboard');
}

export async function readClipboardText(): Promise<string | null> {
  if (isNativeBridge()) {
    try {
      const { Clipboard } = await loadNativeClipboard();
      const result = await Clipboard.read();
      return result.value || null;
    } catch {
      /* fall through to the web API */
    }
  }
  try {
    if (navigator.clipboard?.readText) {
      const value = await navigator.clipboard.readText();
      return value || null;
    }
  } catch {
    /* permission denied or unsupported */
  }
  return null;
}

export async function writeClipboardText(text: string): Promise<boolean> {
  if (isNativeBridge()) {
    try {
      const { Clipboard } = await loadNativeClipboard();
      await Clipboard.write({ string: text });
      return true;
    } catch {
      /* fall through to the web fallback */
    }
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback below */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  } catch {
    return false;
  }
}
