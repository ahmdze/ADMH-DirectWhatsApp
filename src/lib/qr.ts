import QRCode from 'qrcode';

export interface QrStyle {
  size?: number;
  dark?: string;
  light?: string;
  margin?: number;
}

const DEFAULTS: Required<QrStyle> = {
  size: 640,
  dark: '#06231b',
  light: '#ffffff',
  margin: 3
};

export async function qrDataUrl(text: string, style: QrStyle = {}): Promise<string> {
  const options = { ...DEFAULTS, ...style };
  return QRCode.toDataURL(text, {
    width: options.size,
    margin: options.margin,
    errorCorrectionLevel: 'M',
    color: { dark: options.dark, light: options.light }
  });
}

export async function qrSvg(text: string, style: QrStyle = {}): Promise<string> {
  const options = { ...DEFAULTS, ...style };
  return QRCode.toString(text, {
    type: 'svg',
    margin: options.margin,
    errorCorrectionLevel: 'M',
    color: { dark: options.dark, light: options.light }
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image-load-failed'));
    image.src = src;
  });
}

interface LogoOptions extends QrStyle {
  logo?: string | null;
  logoRatio?: number;
  logoPadding?: number;
  rounded?: boolean;
}

/** Render a QR with an optional centered logo (error correction H). */
export async function qrWithLogo(text: string, options: LogoOptions = {}): Promise<string> {
  const size = options.size ?? 720;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: options.margin ?? 2,
    errorCorrectionLevel: 'H',
    color: { dark: options.dark ?? '#06231b', light: options.light ?? '#ffffff' }
  });
  if (options.logo) {
    const context = canvas.getContext('2d');
    if (context) {
      const image = await loadImage(options.logo);
      const ratio = options.logoRatio ?? 0.22;
      const box = size * ratio;
      const pad = size * (options.logoPadding ?? 0.028);
      const x = (size - box) / 2;
      const y = (size - box) / 2;
      context.save();
      context.fillStyle = '#ffffff';
      const radius = options.rounded === false ? 0 : box * 0.22;
      roundRect(context, x - pad, y - pad, box + pad * 2, box + pad * 2, radius);
      context.fill();
      context.beginPath();
      roundRect(context, x, y, box, box, radius);
      context.clip();
      context.drawImage(image, x, y, box, box);
      context.restore();
    }
  }
  return canvas.toDataURL('image/png');
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

export { roundRect };
