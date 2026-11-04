import { useEffect, useState } from 'react';
import { Icon } from '../../components/icons';
import { Button, EmptyState, Sheet, Spinner } from '../../components/ui';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import { dataUrlToBlob, downloadBlob, downloadUrl, shareFiles } from '../../lib/image';
import { qrDataUrl, qrSvg } from '../../lib/qr';
import { toast } from '../../lib/toast';
import { writeClipboardText } from '../../lib/clipboard';

export interface QrPreviewSheetProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

/** Preview + download/share the QR of the current chat link. */
export function QrPreviewSheet({ open, onClose, url, title }: QrPreviewSheetProps) {
  const { t } = useI18n();
  const [dataUrl, setDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open || !url) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    qrDataUrl(url, { size: 640 })
      .then((value) => {
        if (cancelled) return;
        setDataUrl(value);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, url, attempt]);

  const downloadPng = () => {
    if (!dataUrl) return;
    downloadUrl(dataUrl, 'whatsapp-qr.png');
    toast(t('تم تنزيل صورة QR', 'QR image downloaded'), 'success');
    hapticSuccess();
  };

  const downloadSvg = async () => {
    try {
      const svg = await qrSvg(url, { size: 640 });
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'whatsapp-qr.svg');
      toast(t('تم تنزيل ملف SVG', 'SVG file downloaded'), 'success');
      hapticSuccess();
    } catch {
      toast(t('تعذّر تنزيل SVG', 'Could not download the SVG'), 'error');
      hapticError();
    }
  };

  const shareQr = async () => {
    if (!dataUrl) return;
    const file = new File([dataUrlToBlob(dataUrl)], 'whatsapp-qr.png', { type: 'image/png' });
    const shared = await shareFiles([file], { title: title || t('رمز QR', 'QR code'), text: url });
    if (shared) {
      hapticSuccess();
      return;
    }
    const copied = await writeClipboardText(url);
    toast(
      copied ? t('تم نسخ الرابط بدل المشاركة', 'Link copied instead of sharing') : t('تعذّرت المشاركة', 'Could not share'),
      copied ? 'success' : 'error'
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('رمز QR', 'QR code')}
      subtitle={title}
      footer={
        <>
          <Button variant="primary" onClick={downloadPng} disabled={!dataUrl}>
            <Icon name="download" size={16} />
            {t('تنزيل PNG', 'Download PNG')}
          </Button>
          <Button
            variant="soft"
            disabled={!url}
            onClick={() => {
              void downloadSvg();
            }}
          >
            <Icon name="download" size={16} />
            {t('تنزيل SVG', 'Download SVG')}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="row" style={{ justifyContent: 'center', padding: 28 }}>
          <Spinner />
        </div>
      ) : failed ? (
        <EmptyState
          icon="alert"
          title={t('تعذّر إنشاء الرمز', 'Could not create the QR code')}
          description={t('أعد المحاولة، أو انسخ الرابط بدلاً من ذلك.', 'Try again, or copy the link instead.')}
          action={
            <Button variant="soft" size="sm" onClick={() => setAttempt((value) => value + 1)}>
              {t('إعادة المحاولة', 'Try again')}
            </Button>
          }
        />
      ) : (
        <div className="qr-frame">
          <img src={dataUrl} alt={t('رمز QR لرابط المحادثة', 'QR code for the chat link')} width={220} height={220} />
        </div>
      )}
      <p className="list-sub" dir="ltr" style={{ textAlign: 'center', wordBreak: 'break-all' }}>
        {url}
      </p>
      <Button
        variant="ghost"
        block
        disabled={!dataUrl}
        onClick={() => {
          void shareQr();
        }}
      >
        <Icon name="share" size={16} />
        {t('مشاركة صورة QR', 'Share the QR image')}
      </Button>
    </Sheet>
  );
}
