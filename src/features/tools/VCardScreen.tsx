import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/icons';
import { Button, Field, HintCard, ScreenHeader } from '../../components/ui';
import { useActiveWorkspace } from '../../hooks/useData';
import { useI18n } from '../../lib/i18n';
import { useSettings } from '../../lib/settings';
import { workspaceDisplayName } from '../../lib/workspace';
import { goBack } from '../../lib/router';
import { qrDataUrl } from '../../lib/qr';
import { buildChatUrl } from '../../lib/whatsapp';
import { parseTarget } from '../../lib/phone';
import { buildVCard, downloadVCard } from '../../lib/vcard';
import { writeClipboardText } from '../../lib/clipboard';
import { initials } from '../../lib/format';
import { toast } from '../../lib/toast';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { downloadDataUrl, safeFileBase, shareImageDataUrl } from './tools-visual-utils';

export function VCardScreen() {
  const { t, n, locale, phoneError } = useI18n();
  const settings = useSettings();
  const workspace = useActiveWorkspace();
  const nameEdited = useRef(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'qr' | 'share' | null>(null);
  const [touched, setTouched] = useState({ name: false, phone: false });

  useEffect(() => {
    if (nameEdited.current || name.trim() || !workspace) return;
    setName(workspaceDisplayName(workspace, t, locale));
  }, [workspace, locale, name]);

  const parsed = useMemo(
    () => (phone.trim() ? parseTarget(phone, { country: settings.defaultCountry }) : null),
    [phone, settings.defaultCountry]
  );
  const target = parsed && parsed.ok ? parsed.target : null;
  const displayName = name.trim();
  const nameErrorMessage = displayName || !touched.name ? null : t('أدخل الاسم.', 'Enter a name.');
  const phoneErrorMessage = !phone.trim()
    ? touched.phone
      ? t('أدخل رقم الهاتف أو اسم المستخدم.', 'Enter a phone number or username.')
      : null
    : parsed && !parsed.ok
      ? phoneError(parsed.code)
      : null;
  const valid = Boolean(displayName) && Boolean(target);
  const baseName = safeFileBase(displayName, 'whatsapp-contact');

  const vcardText = useMemo(() => {
    if (!displayName || !target) return '';
    return buildVCard({
      name: displayName,
      phone: target.type === 'phone' ? target.value : undefined,
      note: note.trim() || undefined,
      url: buildChatUrl(target)
    });
  }, [displayName, target, note]);

  useEffect(() => {
    if (!vcardText) {
      setQr(null);
      setQrError(null);
      setQrBusy(false);
      return;
    }
    let cancelled = false;
    setQrBusy(true);
    setQrError(null);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const dataUrl = await qrDataUrl(vcardText, { size: 720, dark: '#06231b', light: '#ffffff', margin: 2 });
          if (!cancelled) {
            setQr(dataUrl);
            setQrBusy(false);
          }
        } catch {
          if (!cancelled) {
            setQr(null);
            setQrBusy(false);
            setQrError(
              t(
                'تعذّر توليد رمز البطاقة. اختصر الاسم أو الملاحظة ثم حاول مجدداً.',
                'Could not generate the card QR. Shorten the name or note and try again.'
              )
            );
          }
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [vcardText, t]);

  const handleDownloadVcf = () => {
    if (!valid || !target) {
      toast(t('أكمل الاسم والرقم الصحيح أولاً.', 'Complete the name and a valid number first.'), 'error');
      hapticError();
      return;
    }
    try {
      downloadVCard({
        name: displayName,
        phone: target.type === 'phone' ? target.value : undefined,
        note: note.trim() || undefined,
        url: buildChatUrl(target)
      });
      toast(t('تم تنزيل بطاقة vCard', 'vCard downloaded'), 'success');
      hapticSuccess();
    } catch {
      toast(t('تعذّر تنزيل البطاقة', 'Could not download the card'), 'error');
      hapticError();
    }
  };

  const handleDownloadQr = () => {
    if (!qr) return;
    setExporting('qr');
    try {
      downloadDataUrl(qr, `${baseName}-qr.png`);
      toast(t('تم تنزيل رمز البطاقة', 'Card QR downloaded'), 'success');
      hapticSuccess();
    } catch {
      toast(t('تعذّر تنزيل الرمز', 'Could not download the QR'), 'error');
      hapticError();
    } finally {
      setExporting(null);
    }
  };

  const handleShare = async () => {
    if (!qr) return;
    setExporting('share');
    try {
      const ok = await shareImageDataUrl(qr, `${baseName}-qr.png`, {
        title: displayName,
        text: t('بطاقة تواصل واتساب من ADMH', 'WhatsApp contact card by ADMH')
      });
      if (ok) hapticSuccess();
      else {
        toast(
          t('المشاركة غير مدعومة على هذا المتصفح — نزّل الصورة بدلاً منها.', 'Sharing is not supported here — download the image instead.'),
          'error'
        );
        hapticError();
      }
    } finally {
      setExporting(null);
    }
  };

  const handleCopy = async () => {
    if (!vcardText) return;
    const ok = await writeClipboardText(vcardText);
    if (ok) {
      toast(t('تم نسخ بيانات vCard', 'vCard data copied'), 'success');
      hapticSuccess();
    } else {
      toast(t('تعذّر النسخ', 'Could not copy'), 'error');
      hapticError();
    }
  };

  return (
    <div className="screen">
      <ScreenHeader
        title={t('بطاقة تواصل', 'Contact card')}
        subtitle={t('بطاقة vCard مع رمز QR يفتح محادثة واتساب مباشرة.', 'A vCard with a QR that opens a WhatsApp chat directly.')}
        onBack={() => goBack('/tools')}
      />

      <div className="glass card col" style={{ gap: 14 }}>
        <Field label={t('الاسم', 'Name')} error={nameErrorMessage ?? undefined} counter={`${n(displayName.length)}/60`}>
          <input
            className={`control ${nameErrorMessage ? 'error' : ''}`}
            value={name}
            maxLength={60}
            onChange={(event) => {
              nameEdited.current = true;
              setName(event.target.value);
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            placeholder={t('مثال: أحمد منصور', 'e.g. Ahmed Mansour')}
          />
        </Field>
        <Field
          label={t('رقم الهاتف أو اسم المستخدم', 'Phone number or username')}
          hint={t('يُضمَّن رقمك ورابط واتساب داخل بطاقة vCard.', 'Your number and a WhatsApp link are embedded in the vCard.')}
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
        <Field
          label={t('ملاحظة اختيارية', 'Optional note')}
          hint={t('سطر قصير يظهر داخل جهة الاتصال.', 'A short line stored inside the contact.')}
          counter={`${n(note.length)}/120`}
        >
          <textarea
            className="control"
            value={note}
            rows={2}
            maxLength={120}
            dir="auto"
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('مثال: متجر النخيل — خدمة العملاء', 'e.g. Al Nakheel Store — customer service')}
          />
        </Field>
      </div>

      <div className="glass card col" style={{ gap: 14, alignItems: 'center' }}>
        <div className="row" style={{ width: '100%', gap: 12 }}>
          <span className="avatar round" style={{ width: 54, height: 54, fontSize: 18 }}>
            {initials(displayName) || '؟'}
          </span>
          <div className="list-main">
            <span className="list-title" style={{ fontSize: 16 }}>
              {displayName || t('اسم البطاقة', 'Card name')}
            </span>
            <span className="list-sub" dir="ltr" style={{ textAlign: 'start' }}>
              {target ? target.display : t('رقم الهاتف', 'Phone number')}
            </span>
          </div>
        </div>
        {note.trim() ? (
          <p className="page-sub" style={{ margin: 0, width: '100%' }}>
            {note.trim()}
          </p>
        ) : null}

        <hr className="divider" style={{ width: '100%' }} />

        <div className="col" style={{ gap: 10, alignItems: 'center', width: '100%' }}>
          <p className="section-title">{t('رمز البطاقة', 'Contact QR')}</p>
          {qr ? (
            <div className="qr-frame" style={{ padding: 12 }}>
              <img src={qr} alt={t('رمز بطاقة التواصل', 'Contact card QR')} width={220} height={220} style={{ width: 216, height: 'auto' }} />
            </div>
          ) : qrBusy ? (
            <div className="skeleton" style={{ width: 216, height: 216, borderRadius: 18 }} />
          ) : (
            <p className="field-hint" style={{ textAlign: 'center', margin: 0 }}>
              {t('أكمل الاسم والرقم الصحيح لعرض رمز البطاقة.', 'Complete the name and a valid number to see the QR.')}
            </p>
          )}
          {qrError ? (
            <p className="text-danger" style={{ fontSize: 11.5, margin: 0, textAlign: 'center' }}>
              {qrError}
            </p>
          ) : null}
          <p className="field-hint" style={{ textAlign: 'center', margin: 0 }}>
            {t(
              'يحمل الرمز بطاقة vCard كاملة مع رابط wa.me، فيضيف الجهة لجهات الاتصال ويفتح المحادثة.',
              'The QR carries a full vCard plus a wa.me link, so scanners can save the contact and open the chat.'
            )}
          </p>
        </div>
      </div>

      <div className="grid-2">
        <Button variant="primary" block onClick={handleDownloadVcf} disabled={!valid}>
          <Icon name="download" size={17} />
          {t('تنزيل vCard', 'Download vCard')}
        </Button>
        <Button variant="soft" block onClick={handleDownloadQr} disabled={!qr} loading={exporting === 'qr'}>
          <Icon name="qr" size={17} />
          {t('تنزيل QR', 'Download QR')}
        </Button>
        <Button block onClick={() => void handleShare()} disabled={!qr} loading={exporting === 'share'}>
          <Icon name="share" size={17} />
          {t('مشاركة', 'Share')}
        </Button>
        <Button variant="ghost" block onClick={() => void handleCopy()} disabled={!vcardText}>
          <Icon name="copy" size={17} />
          {t('نسخ vCard', 'Copy vCard')}
        </Button>
      </div>

      <HintCard icon="contact">
        {t(
          'بعد تنزيل ملف .vcf افتحه لإضافته إلى جهات الاتصال. كل شيء محلي، ولا تُرسل البيانات إلى أي خادم.',
          'After downloading the .vcf file, open it to add the contact. Everything is local — no data is sent to a server.'
        )}
      </HintCard>
    </div>
  );
}
