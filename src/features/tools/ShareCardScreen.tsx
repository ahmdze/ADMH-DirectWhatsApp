import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/icons';
import { Button, EmptyState, Field, HintCard, IconButton, ScreenHeader, Spinner } from '../../components/ui';
import { useActiveWorkspace } from '../../hooks/useData';
import { useI18n } from '../../lib/i18n';
import { useSettings, fontFamily, resolveFont } from '../../lib/settings';
import { goBack } from '../../lib/router';
import { loadImage, qrDataUrl } from '../../lib/qr';
import { buildChatUrl } from '../../lib/whatsapp';
import { parseTarget } from '../../lib/phone';
import { canvasToBlob, downloadBlob, shareFiles } from '../../lib/image';
import { toast } from '../../lib/toast';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { readImageFileAsDataUrl, safeFileBase } from './tools-visual-utils';

interface CardPalette {
  id: string;
  ar: string;
  en: string;
  from: string;
  via: string;
  to: string;
  accent: string;
  accent2: string;
  accentInk: string;
  glowA: string;
  glowATo: string;
  glowB: string;
  glowBTo: string;
  qrDark: string;
}

const PALETTES: ReadonlyArray<CardPalette> = [
  {
    id: 'aurora',
    ar: 'أورورا',
    en: 'Aurora',
    from: '#0b3b31',
    via: '#071f1b',
    to: '#04110e',
    accent: '#6ee7b7',
    accent2: '#34d399',
    accentInk: '#04140f',
    glowA: 'rgba(110, 231, 183, 0.34)',
    glowATo: 'rgba(110, 231, 183, 0)',
    glowB: 'rgba(14, 165, 233, 0.26)',
    glowBTo: 'rgba(14, 165, 233, 0)',
    qrDark: '#06231b'
  },
  {
    id: 'midnight',
    ar: 'منتصف الليل',
    en: 'Midnight',
    from: '#102a4c',
    via: '#081726',
    to: '#040b14',
    accent: '#7dd3fc',
    accent2: '#38bdf8',
    accentInk: '#04121f',
    glowA: 'rgba(125, 211, 252, 0.3)',
    glowATo: 'rgba(125, 211, 252, 0)',
    glowB: 'rgba(129, 140, 248, 0.28)',
    glowBTo: 'rgba(129, 140, 248, 0)',
    qrDark: '#12233d'
  },
  {
    id: 'sunset',
    ar: 'غروب',
    en: 'Sunset',
    from: '#40220d',
    via: '#25130a',
    to: '#140a06',
    accent: '#fcd34d',
    accent2: '#f59e0b',
    accentInk: '#241203',
    glowA: 'rgba(252, 211, 77, 0.3)',
    glowATo: 'rgba(252, 211, 77, 0)',
    glowB: 'rgba(244, 114, 182, 0.22)',
    glowBTo: 'rgba(244, 114, 182, 0)',
    qrDark: '#3a2410'
  }
];

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const DEFAULT_CARD_FONT = '"Cairo Variable", "Cairo", system-ui, sans-serif';
let cardFontStack = DEFAULT_CARD_FONT;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

interface DrawCardOptions {
  palette: CardPalette;
  name: string;
  targetDisplay: string;
  qrImage: HTMLImageElement;
  logoImage: HTMLImageElement | null;
  contactLabel: string;
  caption: string;
  footer: string;
}

function applyFont(ctx: CanvasRenderingContext2D, weight: number, size: number): void {
  ctx.font = `${weight} ${size}px ${cardFontStack}`;
}

function primaryFamily(stack: string): string {
  return stack.split(',')[0].replace(/["']/g, '').trim();
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1);
  return `${value}…`;
}

function wrapWords(ctx: CanvasRenderingContext2D, words: string[], maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) {
      current = [current, ...words.slice(index + 1)].join(' ');
      break;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function layoutName(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): { lines: string[]; size: number; lineHeight: number } {
  for (let size = 78; size >= 48; size -= 2) {
    applyFont(ctx, 800, size);
    if (ctx.measureText(text).width <= maxWidth) {
      return { lines: [text], size, lineHeight: Math.round(size * 1.22) };
    }
  }
  const size = 52;
  applyFont(ctx, 800, size);
  const lines = wrapWords(ctx, text.split(/\s+/).filter(Boolean), maxWidth, 2).map((line) => ellipsize(ctx, line, maxWidth));
  return { lines, size, lineHeight: Math.round(size * 1.22) };
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

function drawShareCard(canvas: HTMLCanvasElement, options: DrawCardOptions): void {
  const width = CARD_WIDTH;
  const height = CARD_HEIGHT;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas-unsupported');
  const palette = options.palette;

  ctx.clearRect(0, 0, width, height);

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, palette.from);
  background.addColorStop(0.55, palette.via);
  background.addColorStop(1, palette.to);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const glowA = ctx.createRadialGradient(width * 0.86, height * 0.02, 0, width * 0.86, height * 0.02, width * 0.8);
  glowA.addColorStop(0, palette.glowA);
  glowA.addColorStop(1, palette.glowATo);
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, width, height);

  const glowB = ctx.createRadialGradient(width * 0.05, height * 0.98, 0, width * 0.05, height * 0.98, width * 0.85);
  glowB.addColorStop(0, palette.glowB);
  glowB.addColorStop(1, palette.glowBTo);
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  roundRect(ctx, 80, 110, 920, 1140, 64);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const markSize = 120;
  const markX = (width - markSize) / 2;
  const markY = 180;
  if (options.logoImage) {
    ctx.save();
    roundRect(ctx, markX, markY, markSize, markSize, 32);
    ctx.clip();
    ctx.drawImage(options.logoImage, markX, markY, markSize, markSize);
    ctx.restore();
    ctx.save();
    roundRect(ctx, markX, markY, markSize, markSize, 32);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  } else {
    const markGradient = ctx.createLinearGradient(markX, markY, markX + markSize, markY + markSize);
    markGradient.addColorStop(0, palette.accent);
    markGradient.addColorStop(1, palette.accent2);
    roundRect(ctx, markX, markY, markSize, markSize, 32);
    ctx.fillStyle = markGradient;
    ctx.fill();
    applyFont(ctx, 800, 58);
    ctx.fillStyle = palette.accentInk;
    ctx.fillText('A', width / 2, markY + markSize / 2 + 3);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
  applyFont(ctx, 700, 26);
  ctx.fillText('ADMH · DIRECT WHATSAPP', width / 2, 354);

  const divider = ctx.createLinearGradient(width / 2 - 120, 0, width / 2 + 120, 0);
  divider.addColorStop(0, 'rgba(255, 255, 255, 0)');
  divider.addColorStop(0.5, palette.accent);
  divider.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = divider;
  ctx.fillRect(width / 2 - 120, 392, 240, 3);

  const nameLayout = layoutName(ctx, options.name, 780);
  let cursorY = 452;
  ctx.fillStyle = '#ffffff';
  nameLayout.lines.forEach((line) => {
    applyFont(ctx, 800, nameLayout.size);
    ctx.fillText(line, width / 2, cursorY + nameLayout.size / 2);
    cursorY += nameLayout.lineHeight;
  });

  ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
  applyFont(ctx, 600, 26);
  ctx.fillText(options.contactLabel, width / 2, cursorY + 34);

  ctx.fillStyle = palette.accent;
  let phoneSize = 40;
  applyFont(ctx, 700, phoneSize);
  while (phoneSize > 22 && ctx.measureText(options.targetDisplay).width > 760) {
    phoneSize -= 2;
    applyFont(ctx, 700, phoneSize);
  }
  ctx.fillText(options.targetDisplay, width / 2, cursorY + 82);

  const qrBox = 420;
  const qrX = (width - qrBox) / 2;
  const qrY = 700;
  ctx.save();
  roundRect(ctx, qrX, qrY, qrBox, qrBox, 44);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
  const inner = 344;
  ctx.drawImage(options.qrImage, qrX + (qrBox - inner) / 2, qrY + (qrBox - inner) / 2, inner, inner);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.66)';
  applyFont(ctx, 600, 28);
  ctx.fillText(options.caption, width / 2, 1168);

  ctx.fillStyle = palette.accent;
  applyFont(ctx, 800, 28);
  ctx.fillText(options.footer, width / 2, 1218);
}

export function ShareCardScreen() {
  const { t, n, locale, phoneError } = useI18n();
  const settings = useSettings();
  const workspace = useActiveWorkspace();
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nameEdited = useRef(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paletteId, setPaletteId] = useState(PALETTES[0].id);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [ready, setReady] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'png' | 'share' | null>(null);
  const [touched, setTouched] = useState({ name: false, phone: false });

  useEffect(() => {
    if (nameEdited.current || name.trim() || !workspace) return;
    setName(locale === 'en' ? workspace.nameEn : workspace.name);
  }, [workspace, locale, name]);

  const resolvedFont = fontFamily(resolveFont(locale, settings.font));
  const primaryFont = primaryFamily(resolvedFont);

  useEffect(() => {
    let cancelled = false;
    cardFontStack = resolvedFont;
    setFontsReady(false);
    const prepare = async () => {
      try {
        await document.fonts.ready;
        await document.fonts.load(`800 78px "${primaryFont}"`);
        await document.fonts.load(`700 40px "${primaryFont}"`);
        await document.fonts.load(`600 28px "${primaryFont}"`);
      } catch {
        /* FontFaceSet may be unavailable — fall back to system fonts */
      }
      if (!cancelled) setFontsReady(true);
    };
    void prepare();
    return () => {
      cancelled = true;
    };
  }, [resolvedFont, primaryFont]);

  const parsed = useMemo(
    () => (phone.trim() ? parseTarget(phone, { country: settings.defaultCountry }) : null),
    [phone, settings.defaultCountry]
  );
  const target = parsed && parsed.ok ? parsed.target : null;
  const displayName = name.trim();
  const palette = PALETTES.find((item) => item.id === paletteId) ?? PALETTES[0];
  const nameErrorMessage = displayName || !touched.name ? null : t('أدخل اسماً للبطاقة.', 'Enter a card name.');
  const phoneErrorMessage = !phone.trim()
    ? touched.phone
      ? t('أدخل رقم الهاتف أو اسم المستخدم.', 'Enter a phone number or username.')
      : null
    : parsed && !parsed.ok
      ? phoneError(parsed.code)
      : null;
  const valid = Boolean(displayName) && Boolean(target);
  const filename = `${safeFileBase(displayName, 'whatsapp-card')}-card.png`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!valid || !fontsReady || !target || !canvas) {
      setReady(false);
      setDrawing(false);
      return;
    }
    let cancelled = false;
    setDrawing(true);
    setDrawError(null);
    void (async () => {
      try {
        const qr = await qrDataUrl(buildChatUrl(target), { size: 520, dark: palette.qrDark, light: '#ffffff', margin: 2 });
        const qrImage = await loadImage(qr);
        let logoImage: HTMLImageElement | null = null;
        if (logo) {
          try {
            logoImage = await loadImage(logo);
          } catch {
            logoImage = null;
          }
        }
        if (cancelled) return;
        drawShareCard(canvas, {
          palette,
          name: displayName,
          targetDisplay: target.display,
          qrImage,
          logoImage,
          contactLabel: t('تواصل عبر واتساب', 'Chat on WhatsApp'),
          caption: t('امسح الرمز لفتح المحادثة', 'Scan to open the chat'),
          footer: 'ADMH · WhatsApp Direct'
        });
        setReady(true);
      } catch {
        if (!cancelled) {
          setReady(false);
          setDrawError(t('تعذّر رسم البطاقة. جرّب مرة أخرى.', 'Could not render the card. Try again.'));
        }
      } finally {
        if (!cancelled) setDrawing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [valid, fontsReady, target, displayName, palette, logo, t, resolvedFont]);

  const handleLogoFile = async (file: File | undefined) => {
    if (!file) return;
    setLogoBusy(true);
    const result = await readImageFileAsDataUrl(file, MAX_LOGO_BYTES);
    setLogoBusy(false);
    if (!result.ok) {
      toast(
        result.reason === 'size'
          ? t('حجم الصورة كبير — الحد الأقصى 2 ميجابايت.', 'The image is too large — 2 MB maximum.')
          : t('اختر ملف صورة صالحاً (PNG أو JPG أو WebP).', 'Choose a valid image file (PNG, JPG or WebP).'),
        'error'
      );
      hapticError();
      return;
    }
    setLogo(result.dataUrl);
    hapticSuccess();
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) {
      toast(t('انتظر اكتمال المعاينة أولاً.', 'Wait for the preview to finish.'), 'error');
      return;
    }
    setExporting('png');
    try {
      const blob = await canvasToBlob(canvas);
      downloadBlob(blob, filename);
      toast(t('تم تنزيل البطاقة', 'Card downloaded'), 'success');
      hapticSuccess();
    } catch {
      toast(t('تعذّر تنزيل البطاقة', 'Could not download the card'), 'error');
      hapticError();
    } finally {
      setExporting(null);
    }
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    setExporting('share');
    try {
      const blob = await canvasToBlob(canvas);
      const file = new File([blob], filename, { type: 'image/png' });
      const ok = await shareFiles([file], {
        title: displayName,
        text: t('بطاقة واتساب من ADMH', 'WhatsApp card by ADMH')
      });
      if (ok) hapticSuccess();
      else {
        toast(
          t('المشاركة غير مدعومة على هذا المتصفح — نزّل الصورة بدلاً منها.', 'Sharing is not supported here — download the image instead.'),
          'error'
        );
        hapticError();
      }
    } catch {
      toast(t('تعذّرت المشاركة', 'Could not share'), 'error');
      hapticError();
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="screen">
      <ScreenHeader
        title={t('بطاقة مشاركة', 'Share card')}
        subtitle={t('بطاقة 1080×1350 جاهزة لستوري واتساب أو أي تطبيق.', 'A 1080×1350 card ready for WhatsApp status or any app.')}
        onBack={() => goBack('/tools')}
      />

      <div className="glass card col" style={{ gap: 14 }}>
        <Field label={t('الاسم أو اسم المتجر', 'Name or business name')} error={nameErrorMessage ?? undefined} counter={`${n(name.length)}/40`}>
          <input
            className={`control ${nameErrorMessage ? 'error' : ''}`}
            value={name}
            maxLength={40}
            onChange={(event) => {
              nameEdited.current = true;
              setName(event.target.value);
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            placeholder={t('مثال: متجر النخيل', 'e.g. Al Nakheel Store')}
          />
        </Field>
        <Field
          label={t('رقم الهاتف أو اسم المستخدم', 'Phone number or username')}
          hint={t('يُستخدم الرقم لبناء رابط واتساب داخل الرمز.', 'The number is used to build the WhatsApp link inside the QR.')}
          error={phoneErrorMessage ?? undefined}
        >
          <input
            className={`control ${phoneErrorMessage ? 'error' : ''}`}
            value={phone}
            dir="ltr"
            inputMode="tel"
            maxLength={32}
            onChange={(event) => setPhone(event.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
            placeholder="+964 770 123 4567"
          />
        </Field>

        <div className="col" style={{ gap: 9 }}>
          <p className="section-title">{t('نمط الألوان', 'Color theme')}</p>
          <div className="grid-3">
            {PALETTES.map((item) => {
              const active = palette.id === item.id;
              const label = t(item.ar, item.en);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={label}
                  aria-pressed={active}
                  onClick={() => setPaletteId(item.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 7,
                    padding: 8,
                    minHeight: 74,
                    borderRadius: 16,
                    border: active ? '2px solid var(--accent)' : '1px solid var(--line)',
                    background: active ? 'var(--accent-soft)' : 'var(--glass)'
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: '100%',
                      height: 32,
                      borderRadius: 10,
                      background: `linear-gradient(135deg, ${item.from}, ${item.accent})`
                    }}
                  />
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: active ? 'var(--accent)' : 'var(--muted)' }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <hr className="divider" />

        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <p className="section-title">{t('شعار اختياري', 'Optional logo')}</p>
            <p className="field-hint" style={{ marginTop: 4 }}>
              {t('يظهر أعلى البطاقة. صورة صغيرة أقل من 2 ميجابايت.', 'Appears at the top of the card. A small image under 2 MB.')}
            </p>
          </div>
          <div className="row" style={{ flexShrink: 0 }}>
            {logo ? (
              <>
                <img
                  src={logo}
                  alt={t('الشعار المرفوع', 'Uploaded logo')}
                  width={40}
                  height={40}
                  style={{ borderRadius: 12, objectFit: 'cover', border: '1px solid var(--line)' }}
                />
                <IconButton name="trash" label={t('إزالة الشعار', 'Remove logo')} onClick={() => setLogo(null)} variant="plain" />
              </>
            ) : null}
            <Button variant="soft" onClick={() => fileRef.current?.click()} loading={logoBusy}>
              {logo ? t('تغيير', 'Change') : t('رفع', 'Upload')}
            </Button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          hidden
          aria-label={t('اختيار شعار', 'Choose a logo')}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            void handleLogoFile(file);
          }}
        />
      </div>

      <div className="glass card col" style={{ gap: 12 }}>
        <div className="row-between">
          <p className="section-title">{t('المعاينة', 'Preview')}</p>
          {drawing || !fontsReady ? <Spinner size={16} /> : null}
        </div>
        {valid ? (
          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 20, background: '#04100d' }}
            />
            {drawing || !fontsReady ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(4, 16, 13, 0.42)',
                  borderRadius: 20
                }}
              >
                <Spinner size={26} />
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon="card"
            title={t('أكمل البيانات لرؤية البطاقة', 'Complete the details to see the card')}
            description={t(
              'اكتب الاسم والرقم الصحيح، وستُرسم البطاقة هنا فوراً.',
              'Enter a name and a valid number, and the card is drawn here instantly.'
            )}
          />
        )}
        {drawError ? (
          <p className="text-danger" style={{ fontSize: 11.5, margin: 0 }}>
            {drawError}
          </p>
        ) : null}
      </div>

      <div className="grid-2">
        <Button variant="primary" block onClick={() => void handleDownload()} disabled={!ready || drawing} loading={exporting === 'png'}>
          <Icon name="download" size={17} />
          {t('تنزيل PNG', 'Download PNG')}
        </Button>
        <Button block onClick={() => void handleShare()} disabled={!ready || drawing} loading={exporting === 'share'}>
          <Icon name="share" size={17} />
          {t('مشاركة', 'Share')}
        </Button>
      </div>

      <HintCard icon="info">
        {t(
          'يُنتظر جاهزية الخط العربي قبل الرسم، لذا تظهر المعاينة بنفس جودة الملف النهائي.',
          'The Arabic font is awaited before drawing, so what you preview matches the final file.'
        )}
      </HintCard>
    </div>
  );
}
