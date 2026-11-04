import { useEffect, useMemo, useState } from 'react';
import { Button, Sheet, Segmented } from '../../components/ui';
import { Icon } from '../../components/icons';
import { useI18n } from '../../lib/i18n';
import { buildChatUrl } from '../../lib/whatsapp';
import { qrDataUrl } from '../../lib/qr';
import { cardPreviewModel, labelPreviewModel } from '../../lib/composePreview';
import type { MediaAttachment } from '../../lib/media';
import type { Target } from '../../types';
import { ComposePreview } from './ComposePreview';

type PreviewTab = 'whatsapp' | 'card' | 'label';

interface PreviewSheetProps {
  open: boolean;
  target: Target | null;
  message: string;
  media: MediaAttachment[];
  workspaceName: string;
  onClose: () => void;
}

/** C2/C3: one sheet with WhatsApp, share-card and QR-label previews. */
export function PreviewSheet({ open, target, message, media, workspaceName, onClose }: PreviewSheetProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<PreviewTab>('whatsapp');
  const [qr, setQr] = useState('');

  const card = useMemo(() => cardPreviewModel(target, workspaceName, message), [target, workspaceName, message]);
  const label = useMemo(() => labelPreviewModel(target, workspaceName), [target, workspaceName]);

  useEffect(() => {
    if (!open || !target) {
      setQr('');
      return;
    }
    let active = true;
    void qrDataUrl(buildChatUrl(target), { size: 320, dark: '#06231b', light: '#ffffff', margin: 2 })
      .then((url) => {
        if (active) setQr(url);
      })
      .catch(() => {
        if (active) setQr('');
      });
    return () => {
      active = false;
    };
  }, [open, target]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('معاينة قبل الإرسال', 'Preview before sending')}
      subtitle={t('كل شيء محلي — لا تُجلب الروابط ولا تُرسل بيانات.', 'Everything is local — links are not fetched and no data is sent.')}
      footer={
        <Button variant="primary" block onClick={onClose}>
          {t('إغلاق المعاينة', 'Close preview')}
        </Button>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <Segmented
          value={tab}
          options={[
            { value: 'whatsapp', label: t('واتساب', 'WhatsApp') },
            { value: 'card', label: t('بطاقة', 'Card') },
            { value: 'label', label: t('ملصق', 'Label') }
          ]}
          onChange={(value) => setTab(value as PreviewTab)}
        />

        {tab === 'whatsapp' ? <ComposePreview target={target} message={message} media={media} /> : null}

        {tab === 'card' ? (
          target ? (
            <div
              dir="rtl"
              style={{
                minHeight: 290,
                borderRadius: 22,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: 'linear-gradient(140deg, #06231b 0%, #0d3b2f 55%, #17624d 100%)',
                border: '1px solid var(--line-strong)',
                color: '#f1fff9'
              }}
            >
              <div className="row-between">
                <span className="row" style={{ gap: 7, fontSize: 11, fontWeight: 800 }}>
                  <Icon name="whatsapp" size={17} /> ADMH
                </span>
                <span style={{ fontSize: 10, opacity: 0.8 }}>{card.workspaceName}</span>
              </div>
              <div className="col" style={{ gap: 5 }}>
                <b style={{ fontSize: 24, lineHeight: 1.3 }}>{card.name}</b>
                <span dir="ltr" style={{ fontSize: 13, opacity: 0.9, alignSelf: 'flex-start' }}>
                  {card.handle}
                </span>
              </div>
              {card.message ? (
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: 10 }}>
                  {card.message}
                </p>
              ) : null}
              <span style={{ fontSize: 9.5, opacity: 0.75 }}>{t('معاينة بطاقة المشاركة', 'Share card preview')}</span>
            </div>
          ) : (
            <p className="field-hint" style={{ margin: 0 }}>{t('أدخل وجهة لعرض البطاقة.', 'Enter a destination to preview the card.')}</p>
          )
        ) : null}

        {tab === 'label' ? (
          target ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 18, background: 'var(--glass-soft)', borderRadius: 18 }}>
              <div
                style={{
                  width: '78%',
                  maxWidth: 240,
                  background: '#ffffff',
                  color: '#06231b',
                  borderRadius: 14,
                  padding: 16,
                  textAlign: 'center',
                  boxShadow: '0 12px 30px rgba(0,0,0,.28)'
                }}
              >
                {qr ? <img src={qr} alt="" style={{ width: '100%', display: 'block', marginBottom: 8 }} /> : <span className="spinner" style={{ margin: '0 auto 8px' }} />}
                <b style={{ display: 'block', fontSize: 12, lineHeight: 1.4 }}>{label.name}</b>
                <span dir="ltr" style={{ display: 'block', fontSize: 9.5, color: '#52746a', marginTop: 3 }}>
                  {label.handle}
                </span>
                <span style={{ display: 'block', fontSize: 8.5, color: '#7b968d', marginTop: 6 }}>{label.workspaceName}</span>
              </div>
            </div>
          ) : (
            <p className="field-hint" style={{ margin: 0 }}>{t('أدخل وجهة لتوليد الملصق.', 'Enter a destination to generate the label.')}</p>
          )
        ) : null}
      </div>
    </Sheet>
  );
}
