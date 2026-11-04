import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/icons';
import { Button, Chip, EmptyState, Field, HintCard, IconButton, ScreenHeader, Segmented, Spinner } from '../../components/ui';
import { useActiveWorkspace, useDestinations } from '../../hooks/useData';
import { useI18n } from '../../lib/i18n';
import { goBack, navigate } from '../../lib/router';
import { qrDataUrl, qrSvg, qrWithLogo } from '../../lib/qr';
import { buildChatUrl } from '../../lib/whatsapp';
import { writeClipboardText } from '../../lib/clipboard';
import { toast } from '../../lib/toast';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import {
  destinationToTarget,
  downloadDataUrl,
  downloadSvg,
  readImageFileAsDataUrl,
  safeFileBase,
  shareImageDataUrl
} from './tools-visual-utils';

type QrMode = 'saved' | 'custom';

const QR_COLORS: ReadonlyArray<{ value: string; ar: string; en: string }> = [
  { value: '#06231b', ar: 'أخضر داكن', en: 'Deep green' },
  { value: '#111827', ar: 'أسود', en: 'Black' },
  { value: '#0f766e', ar: 'فيروزي', en: 'Teal' },
  { value: '#1d4ed8', ar: 'أزرق', en: 'Blue' },
  { value: '#6d28d9', ar: 'بنفسجي', en: 'Violet' },
  { value: '#b91c1c', ar: 'أحمر', en: 'Red' }
];

const MAX_CUSTOM_CHARS = 500;
const MAX_BYTES_LOGO = 1100;
const MAX_BYTES_PLAIN = 1800;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function byteLength(value: string): number {
  try {
    return new TextEncoder().encode(value).length;
  } catch {
    return value.length;
  }
}

export function QrGenerateScreen() {
  const { t, n } = useI18n();
  const workspace = useActiveWorkspace();
  const destinations = useDestinations(workspace?.id);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<QrMode>('saved');
  const [selectedId, setSelectedId] = useState('');
  const [customText, setCustomText] = useState('');
  const [message, setMessage] = useState('');
  const [dark, setDark] = useState(QR_COLORS[0].value);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'png' | 'svg' | null>(null);

  const selected = useMemo(
    () => destinations.find((item) => item.id === selectedId) ?? destinations[0] ?? null,
    [destinations, selectedId]
  );

  const payload = useMemo(() => {
    if (mode === 'custom') return customText;
    if (!selected) return '';
    const target = destinationToTarget(selected);
    if (!target) return '';
    return buildChatUrl(target, message.trim() || undefined);
  }, [mode, customText, selected, message]);

  const trimmed = payload.trim();
  const bytes = byteLength(trimmed);
  const maxBytes = logo ? MAX_BYTES_LOGO : MAX_BYTES_PLAIN;
  const tooLong = bytes > maxBytes;
  const validationError = tooLong
    ? t(
        `النص أطول من سعة الرمز (${n(bytes)} من ${n(maxBytes)} بايت). ${logo ? 'أزل الشعار أو ' : ''}اختصر النص.`,
        `The text exceeds the code capacity (${n(bytes)} of ${n(maxBytes)} bytes). ${logo ? 'Remove the logo or shorten the text.' : 'Shorten the text.'}`
      )
    : null;
  const baseName = safeFileBase(mode === 'saved' ? selected?.label || '' : 'whatsapp-qr', 'whatsapp-qr');
  const previewHint = mode === 'custom'
    ? t('اكتب رابطاً أو نصاً لتوليد الرمز.', 'Type a link or text to generate the code.')
    : t('اختر وجهة محفوظة لعرض الرمز.', 'Pick a saved target to see the code.');

  useEffect(() => {
    if (!trimmed || tooLong) {
      setPreview(null);
      setError(null);
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    setError(null);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const dataUrl = logo
            ? await qrWithLogo(trimmed, { size: 900, dark, light: '#ffffff', margin: 2, logo, rounded: true })
            : await qrDataUrl(trimmed, { size: 900, dark, light: '#ffffff', margin: 2 });
          if (!cancelled) {
            setPreview(dataUrl);
            setBusy(false);
          }
        } catch {
          if (!cancelled) {
            setPreview(null);
            setError(
              t(
                'تعذّر توليد الرمز. جرّب نصاً أقصر أو لوناً آخر.',
                'Could not generate the code. Try shorter text or another color.'
              )
            );
            setBusy(false);
          }
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed, tooLong, dark, logo, t]);

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

  const handleCopy = async () => {
    const ok = await writeClipboardText(trimmed);
    if (ok) {
      toast(t('تم نسخ النص', 'Text copied'), 'success');
      hapticSuccess();
    } else {
      toast(t('تعذّر النسخ', 'Could not copy'), 'error');
      hapticError();
    }
  };

  const handlePng = () => {
    if (!preview) return;
    setExporting('png');
    try {
      downloadDataUrl(preview, `${baseName}.png`);
      toast(t('تم تنزيل الصورة', 'Image downloaded'), 'success');
      hapticSuccess();
    } catch {
      toast(t('تعذّر تنزيل الصورة', 'Could not download the image'), 'error');
      hapticError();
    } finally {
      setExporting(null);
    }
  };

  const handleSvg = async () => {
    if (!trimmed) return;
    setExporting('svg');
    try {
      const svg = await qrSvg(trimmed, { dark, light: '#ffffff', margin: 2 });
      downloadSvg(svg, `${baseName}.svg`);
      toast(
        logo
          ? t('تم تنزيل SVG — الشعار لا يُضمَّن في هذه الصيغة.', 'SVG downloaded — the logo is not embedded in this format.')
          : t('تم تنزيل SVG', 'SVG downloaded'),
        'success'
      );
      hapticSuccess();
    } catch {
      toast(t('تعذّر تنزيل SVG', 'Could not download the SVG'), 'error');
      hapticError();
    } finally {
      setExporting(null);
    }
  };

  const handleShare = async () => {
    if (!preview) return;
    const ok = await shareImageDataUrl(preview, `${baseName}.png`, {
      title: t('رمز QR واتساب', 'WhatsApp QR'),
      text: trimmed
    });
    if (ok) hapticSuccess();
    else {
      toast(
        t('المشاركة غير مدعومة على هذا المتصفح — نزّل الصورة بدلاً منها.', 'Sharing is not supported here — download the image instead.'),
        'error'
      );
      hapticError();
    }
  };

  return (
    <div className="screen">
      <ScreenHeader
        title={t('توليد QR', 'Generate QR')}
        subtitle={t('رمز جاهز للطباعة أو المشاركة، بلا رفع إلى أي خادم.', 'A code ready to print or share, never uploaded to a server.')}
        onBack={() => goBack('/tools')}
      />

      <div className="glass card col" style={{ gap: 14 }}>
        <Segmented<QrMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'saved', label: t('وجهة محفوظة', 'Saved target') },
            { value: 'custom', label: t('نص مخصص', 'Custom text') }
          ]}
        />

        {mode === 'saved' ? (
          destinations.length ? (
            <div className="col" style={{ gap: 9 }}>
              <p className="section-title">{t('اختر الوجهة', 'Choose a target')}</p>
              <div className="chip-row">
                {destinations.map((destination) => (
                  <Chip
                    key={destination.id}
                    active={selected?.id === destination.id}
                    onClick={() => setSelectedId(destination.id)}
                    title={destination.label}
                  >
                    <Icon name={destination.type === 'username' ? 'user' : 'phone'} size={13} />
                    <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{destination.label}</span>
                  </Chip>
                ))}
              </div>
              <Field
                label={t('رسالة اختيارية', 'Optional message')}
                hint={t('تُضمَّن في الرابط كرسالة جاهزة عند فتح المحادثة.', 'Embedded in the link as a prefilled message.')}
                counter={`${n(message.length)}/500`}
              >
                <input
                  className="control"
                  value={message}
                  maxLength={500}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t('مرحباً، أود الاستفسار…', 'Hello, I would like to ask…')}
                />
              </Field>
            </div>
          ) : (
            <EmptyState
              icon="users"
              title={t('لا توجد وجهات محفوظة', 'No saved targets')}
              description={t(
                'أضف وجهة أولاً، أو بدّل إلى النص المخصص للصق رابط واتساب مباشرة.',
                'Add a target first, or switch to custom text and paste a WhatsApp link.'
              )}
              action={
                <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Button variant="soft" onClick={() => navigate('/targets')}>
                    {t('إدارة الوجهات', 'Manage targets')}
                  </Button>
                  <Button variant="ghost" onClick={() => setMode('custom')}>
                    {t('نص مخصص', 'Custom text')}
                  </Button>
                </div>
              }
            />
          )
        ) : (
          <Field
            label={t('النص أو الرابط', 'Text or link')}
            hint={t('رابط wa.me أو أي نص تريد تضمينه في الرمز.', 'A wa.me link or any text you want inside the code.')}
            error={validationError ?? undefined}
            counter={`${n(customText.length)}/${n(MAX_CUSTOM_CHARS)}`}
          >
            <textarea
              className={`control ${validationError ? 'error' : ''}`}
              value={customText}
              maxLength={MAX_CUSTOM_CHARS}
              rows={3}
              dir="auto"
              onChange={(event) => setCustomText(event.target.value)}
              placeholder="https://wa.me/9647701234567"
            />
          </Field>
        )}
      </div>

      <div className="glass card col" style={{ gap: 14 }}>
        <div className="col" style={{ gap: 9 }}>
          <p className="section-title">{t('لون الرمز', 'Code color')}</p>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {QR_COLORS.map((color) => {
              const active = dark === color.value;
              const label = t(color.ar, color.en);
              return (
                <button
                  key={color.value}
                  type="button"
                  aria-label={label}
                  aria-pressed={active}
                  title={label}
                  onClick={() => setDark(color.value)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: color.value,
                    border: active ? '2px solid var(--text)' : '1px solid var(--line-strong)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#ffffff',
                    boxShadow: active ? '0 0 0 3px var(--accent-soft)' : undefined
                  }}
                >
                  {active ? <Icon name="check" size={18} /> : null}
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
              {t('يُوضع في منتصف الرمز. صورة صغيرة أقل من 2 ميجابايت.', 'Centered inside the code. A small image under 2 MB.')}
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

      <div className="glass card col" style={{ gap: 14, alignItems: 'center' }}>
        <div className="row-between" style={{ width: '100%' }}>
          <p className="section-title">{t('المعاينة', 'Preview')}</p>
          {busy ? <Spinner size={16} /> : null}
        </div>

        {preview ? (
          <div className="qr-frame" style={{ padding: 14 }}>
            <img src={preview} alt={t('رمز QR المولَّد', 'Generated QR code')} width={260} height={260} style={{ width: 244, height: 'auto' }} />
          </div>
        ) : (
          <div
            className="glass-soft"
            style={{ width: '100%', maxWidth: 300, aspectRatio: '1 / 1', display: 'grid', placeItems: 'center', padding: 18, textAlign: 'center' }}
          >
            {error ? (
              <span className="text-danger" style={{ fontSize: 11.5 }}>
                {error}
              </span>
            ) : (
              <span className="col" style={{ alignItems: 'center', gap: 8, color: 'var(--muted)' }}>
                <Icon name="qr" size={26} />
                <span style={{ fontSize: 11.5, lineHeight: 1.6 }}>{previewHint}</span>
              </span>
            )}
          </div>
        )}

        {trimmed && !error ? (
          <p
            className="text-muted"
            dir="auto"
            style={{ fontSize: 10.5, margin: 0, wordBreak: 'break-word', textAlign: 'center', maxWidth: '100%' }}
          >
            {trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed}
          </p>
        ) : null}
      </div>

      <div className="grid-2">
        <Button variant="primary" block onClick={handlePng} disabled={!preview || busy} loading={exporting === 'png'}>
          <Icon name="download" size={17} />
          {t('تنزيل PNG', 'Download PNG')}
        </Button>
        <Button variant="soft" block onClick={() => void handleSvg()} disabled={!trimmed || tooLong} loading={exporting === 'svg'}>
          <Icon name="download" size={17} />
          {t('تنزيل SVG', 'Download SVG')}
        </Button>
        <Button block onClick={() => void handleShare()} disabled={!preview}>
          <Icon name="share" size={17} />
          {t('مشاركة الصورة', 'Share image')}
        </Button>
        <Button variant="ghost" block onClick={() => void handleCopy()} disabled={!trimmed}>
          <Icon name="copy" size={17} />
          {t('نسخ النص', 'Copy text')}
        </Button>
      </div>

      <HintCard icon="info">
        {t(
          'الرموز الملوّنة تُقرأ بأفضل شكل على خلفية بيضاء. عند إضافة شعار يُستخدم تصحيح خطأ أعلى للحفاظ على قابلية القراءة.',
          'Colored codes read best on a white background. Adding a logo switches to a higher error-correction level to keep the code readable.'
        )}
      </HintCard>
    </div>
  );
}
