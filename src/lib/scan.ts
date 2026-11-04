import jsQR from 'jsqr';

interface DetectedBarcode {
  rawValue: string;
  format?: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource | ImageBitmap | HTMLVideoElement | Blob): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

export function supportsNativeBarcode(): boolean {
  return typeof window !== 'undefined' && typeof window.BarcodeDetector === 'function';
}

async function nativeDetect(source: CanvasImageSource | ImageBitmap): Promise<string | null> {
  if (!supportsNativeBarcode()) return null;
  try {
    const detector = new window.BarcodeDetector!({ formats: ['qr_code'] });
    const codes = await detector.detect(source);
    return codes[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

function imageDataFrom(source: CanvasImageSource, maxSide = 960): ImageData | null {
  const canvas = document.createElement('canvas');
  let width = 0;
  let height = 0;
  if (source instanceof HTMLVideoElement) {
    width = source.videoWidth;
    height = source.videoHeight;
  } else if (source instanceof ImageBitmap) {
    width = source.width;
    height = source.height;
  } else if (source instanceof HTMLImageElement) {
    width = source.naturalWidth;
    height = source.naturalHeight;
  } else if (source instanceof HTMLCanvasElement) {
    width = source.width;
    height = source.height;
  }
  if (!width || !height) return null;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function decodeViaJsQr(source: CanvasImageSource): string | null {
  const data = imageDataFrom(source);
  if (!data) return null;
  try {
    const result = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
    return result?.data ?? null;
  } catch {
    return null;
  }
}

/** Decode a QR from an uploaded image file. */
export async function decodeImageFile(file: File): Promise<string | null> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const native = await nativeDetect(bitmap);
    if (native) return native;
    return decodeViaJsQr(bitmap);
  } catch {
    // Fallback through <img> for browsers without createImageBitmap
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('decode-failed'));
        el.src = url;
      });
      const native = await nativeDetect(image);
      if (native) return native;
      return decodeViaJsQr(image);
    } catch {
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  } finally {
    bitmap?.close?.();
  }
}

export interface CameraScanner {
  stop: () => void;
  setTorch: (on: boolean) => Promise<boolean>;
  video: HTMLVideoElement;
}

interface StartOptions {
  video: HTMLVideoElement;
  onResult: (value: string) => void;
  onStatus?: (status: 'scanning' | 'unsupported') => void;
}

/** Start the camera and scan QR codes continuously. */
export async function startCameraScanner({ video, onResult, onStatus }: StartOptions): Promise<CameraScanner> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
  });
  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  video.muted = true;
  await video.play().catch(() => undefined);

  const native = supportsNativeBarcode();
  onStatus?.(native ? 'scanning' : 'unsupported');
  const detector = native ? new window.BarcodeDetector!({ formats: ['qr_code'] }) : null;
  let stopped = false;
  let timer: number | undefined;
  let busy = false;

  const tick = async () => {
    if (stopped) return;
    if (!busy) {
      busy = true;
      try {
        let value: string | null = null;
        if (detector) {
          const codes = await detector.detect(video);
          value = codes[0]?.rawValue ?? null;
        }
        if (!value) value = decodeViaJsQr(video);
        if (value) {
          onResult(value);
          stop();
          return;
        }
      } catch {
        /* keep scanning */
      } finally {
        busy = false;
      }
    }
    timer = window.setTimeout(tick, 140);
  };

  const stop = () => {
    stopped = true;
    if (timer) window.clearTimeout(timer);
    stream.getTracks().forEach((track) => track.stop());
    video.pause();
    video.srcObject = null;
  };

  video.addEventListener('loadedmetadata', () => undefined, { once: true });
  void tick();

  return {
    stop,
    video,
    setTorch: async (on: boolean) => {
      const track = stream.getVideoTracks()[0];
      if (!track) return false;
      try {
        const capabilities = track.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
        if (!capabilities?.torch) return false;
        await track.applyConstraints({ advanced: [{ torch: on }] } as unknown as MediaTrackConstraints);
        return true;
      } catch {
        return false;
      }
    }
  };
}
