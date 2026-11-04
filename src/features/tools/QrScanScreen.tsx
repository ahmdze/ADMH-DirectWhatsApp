import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/icons';
import { Button, EmptyState, HintCard, IconButton, ScreenHeader, Spinner } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { useSettings } from '../../lib/settings';
import { goBack, navigate } from '../../lib/router';
import { setDraft } from '../../lib/launch';
import { extractCandidateFromText, parseTarget } from '../../lib/phone';
import { decodeImageFile, startCameraScanner, supportsNativeBarcode, type CameraScanner } from '../../lib/scan';
import { writeClipboardText } from '../../lib/clipboard';
import { toast } from '../../lib/toast';
import { hapticError, hapticSuccess } from '../../lib/haptics';

type Translate = (ar: string, en: string) => string;
type ScanStatus = 'idle' | 'starting' | 'scanning' | 'error';

function cameraErrorMessage(error: unknown, t: Translate): string {
  if (!window.isSecureContext) {
    return t(
      'فتح الكاميرا يتطلب اتصالاً آمناً (HTTPS) أو localhost.',
      'Opening the camera needs a secure connection (HTTPS) or localhost.'
    );
  }
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return t(
      'تم رفض إذن الكاميرا. اسمح بالوصول من إعدادات المتصفح ثم أعد المحاولة.',
      'Camera permission was denied. Allow access in the browser settings and try again.'
    );
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return t('لم نجد كاميرا متاحة على هذا الجهاز.', 'No camera was found on this device.');
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return t(
      'الكاميرا مشغولة بتطبيق آخر. أغلق التطبيقات الأخرى ثم أعد المحاولة.',
      'The camera is in use by another app. Close it and try again.'
    );
  }
  return t(
    'تعذّر تشغيل الكاميرا. يمكنك قراءة الرمز من صورة بدلاً من ذلك.',
    'Could not start the camera. You can scan from an image instead.'
  );
}

export function QrScanScreen() {
  const { t } = useI18n();
  const settings = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<CameraScanner | null>(null);
  const aliveRef = useRef(true);
  const resultHandledRef = useRef(false);

  const [status, setStatus] = useState<ScanStatus>('idle');
  const [fallback, setFallback] = useState(() => !supportsNativeBarcode());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      scannerRef.current?.stop();
      scannerRef.current = null;
      const video = videoRef.current;
      if (video) {
        const stream = video.srcObject;
        if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
    };
  }, []);

  const parsed = useMemo(() => {
    if (!result) return null;
    const candidate = extractCandidateFromText(result) || result;
    const outcome = parseTarget(candidate, { country: settings.defaultCountry });
    return outcome.ok ? outcome.target : null;
  }, [result, settings.defaultCountry]);

  const stopCamera = () => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    setTorchAvailable(false);
    setTorchOn(false);
    setStatus('idle');
  };

  const startCamera = async () => {
    if (status === 'starting' || status === 'scanning') return;
    setError(null);

    if (!window.isSecureContext) {
      const message = cameraErrorMessage(new Error('insecure'), t);
      setError(message);
      setStatus('error');
      toast(message, 'error');
      hapticError();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = t(
        'هذا المتصفح لا يدعم الوصول إلى الكاميرا. استخدم خيار «قراءة من صورة».',
        'This browser cannot access the camera. Use “Read from image” instead.'
      );
      setError(message);
      setStatus('error');
      toast(message, 'error');
      hapticError();
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    resultHandledRef.current = false;
    setStatus('starting');
    try {
      const scanner = await startCameraScanner({
        video,
        onResult: (value) => {
          resultHandledRef.current = true;
          scannerRef.current?.stop();
          scannerRef.current = null;
          setTorchAvailable(false);
          setTorchOn(false);
          setStatus('idle');
          setError(null);
          setResult(value);
          toast(t('تم قراءة الرمز بنجاح', 'QR code detected'), 'success');
          hapticSuccess();
        },
        onStatus: (value) => {
          if (aliveRef.current) setFallback(value === 'unsupported');
        }
      });
      if (!aliveRef.current || resultHandledRef.current) {
        scanner.stop();
        return;
      }
      scannerRef.current = scanner;
      setStatus('scanning');
      const torch = await scanner.setTorch(false);
      if (aliveRef.current) setTorchAvailable(torch);
    } catch (err) {
      if (!aliveRef.current) return;
      const stream = videoRef.current?.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      const message = cameraErrorMessage(err, t);
      setError(message);
      setStatus('error');
      toast(message, 'error');
      hapticError();
    }
  };

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    const next = !torchOn;
    const ok = await scanner.setTorch(next);
    if (ok) setTorchOn(next);
    else toast(t('الفلاش غير متوفر على هذه الكاميرا.', 'Flash is not available on this camera.'), 'error');
  };

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;
    setDecoding(true);
    try {
      const value = await decodeImageFile(file);
      if (value) {
        setResult(value);
        setError(null);
        toast(t('تم قراءة الرمز من الصورة', 'QR code read from the image'), 'success');
        hapticSuccess();
      } else {
        toast(
          t('لم نعثر على رمز QR واضح في الصورة. جرّب صورة أوضح أو مقربة.', 'No clear QR code found in that image. Try a sharper, closer photo.'),
          'error'
        );
        hapticError();
      }
    } catch {
      toast(t('تعذّرت قراءة الصورة.', 'Could not read the image.'), 'error');
      hapticError();
    } finally {
      setDecoding(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleUse = () => {
    if (!result) return;
    const raw = extractCandidateFromText(result) || result.trim();
    setDraft({ raw, origin: 'scan' });
    navigate('/compose');
  };

  const handleCopy = async () => {
    if (!result) return;
    const ok = await writeClipboardText(result);
    if (ok) {
      toast(t('تم نسخ النتيجة', 'Result copied'), 'success');
      hapticSuccess();
    } else {
      toast(t('تعذّر النسخ', 'Could not copy'), 'error');
      hapticError();
    }
  };

  const displayResult = result && result.length > 1500 ? `${result.slice(0, 1500)}…` : result;

  return (
    <div className="screen">
      <ScreenHeader
        title={t('مسح QR', 'Scan QR')}
        subtitle={t('امسح رمز واتساب بالكاميرا أو من صورة على جهازك.', 'Scan a WhatsApp code with the camera or from an image on your device.')}
        onBack={() => goBack('/tools')}
      />

      <div className="scan-frame" style={{ background: '#04100d' }}>
        <video ref={videoRef} className="scan-video" muted playsInline aria-label={t('معاينة الكاميرا', 'Camera preview')} />
        {status !== 'scanning' ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(4, 16, 13, 0.74)',
              padding: 16,
              borderRadius: 22
            }}
          >
            {status === 'starting' ? (
              <div className="col" style={{ alignItems: 'center', gap: 10 }}>
                <Spinner size={24} />
                <p className="page-sub" style={{ margin: 0 }}>
                  {t('جارٍ تشغيل الكاميرا…', 'Starting camera…')}
                </p>
              </div>
            ) : status === 'error' && error ? (
              <div className="col" style={{ alignItems: 'center', gap: 10, textAlign: 'center' }}>
                <Icon name="alert" size={26} />
                <p className="text-danger" style={{ fontSize: 12, margin: 0, maxWidth: 290, lineHeight: 1.7 }}>
                  {error}
                </p>
              </div>
            ) : (
              <EmptyState
                icon="scan"
                title={t('الكاميرا متوقفة', 'Camera is off')}
                description={t(
                  'اضغط «تشغيل الكاميرا» لبدء المسح، أو اقرأ الرمز من صورة محفوظة.',
                  'Tap “Start camera” to begin, or read the code from a saved image.'
                )}
              />
            )}
          </div>
        ) : (
          <div style={{ position: 'absolute', insetInline: 0, bottom: 12, display: 'flex', justifyContent: 'center' }}>
            <span className="badge accent">{t('جارٍ المسح…', 'Scanning…')}</span>
          </div>
        )}
      </div>

      {status === 'scanning' ? (
        <div className="grid-2">
          <Button variant="danger" block onClick={stopCamera}>
            <Icon name="x" size={17} />
            {t('إيقاف الكاميرا', 'Stop camera')}
          </Button>
          <Button variant={torchOn ? 'soft' : 'default'} block onClick={() => void toggleTorch()} disabled={!torchAvailable}>
            <Icon name="sun" size={17} />
            {torchOn ? t('إطفاء الفلاش', 'Flash off') : t('تشغيل الفلاش', 'Flash on')}
          </Button>
        </div>
      ) : (
        <Button variant="primary" size="lg" block onClick={() => void startCamera()} loading={status === 'starting'} disabled={status === 'starting'}>
          <Icon name="camera" size={19} />
          {t('تشغيل الكاميرا', 'Start camera')}
        </Button>
      )}

      <Button variant="soft" block onClick={() => fileRef.current?.click()} loading={decoding} disabled={decoding}>
        <Icon name="image" size={17} />
        {t('قراءة من صورة', 'Read from image')}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        aria-label={t('اختيار صورة تحتوي رمز QR', 'Choose an image containing a QR code')}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          void handleImageFile(file);
        }}
      />

      {result ? (
        <div className="glass card col" style={{ gap: 12 }}>          <div className="row-between">
            <p className="section-title">{t('النتيجة', 'Result')}</p>
            <IconButton name="x" label={t('مسح النتيجة', 'Clear result')} variant="plain" onClick={() => setResult(null)} />
          </div>
          <div
            dir="ltr"
            style={{
              padding: '11px 13px',
              borderRadius: 14,
              background: 'var(--glass)',
              border: '1px solid var(--line)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
              lineHeight: 1.65,
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: 150,
              overflow: 'auto'
            }}
          >
            {displayResult}
          </div>
          {parsed ? (
            <p className="page-sub" style={{ margin: 0 }}>
              {t('الوجهة المكتشفة:', 'Detected target:')}{' '}
              <b dir="ltr" style={{ color: 'var(--text)' }}>
                {parsed.display}
              </b>
            </p>
          ) : (
            <p className="page-sub" style={{ margin: 0 }}>
              {t(
                'هذا النص ليس رابط واتساب معروفاً — يمكنك نسخه أو تمريره إلى شاشة الإرسال كما هو.',
                'This is not a known WhatsApp link — you can copy it or pass it to the compose screen as-is.'
              )}
            </p>
          )}
          <Button variant="primary" block onClick={handleUse}>
            <Icon name="send" size={17} />
            {t('استخدام في الإرسال', 'Use in compose')}
          </Button>
          <Button variant="soft" block onClick={() => void handleCopy()}>
            <Icon name="copy" size={17} />
            {t('نسخ النتيجة', 'Copy result')}
          </Button>
        </div>
      ) : null}

      {fallback ? (
        <HintCard icon="info">
          {t(
            'متصفحك لا يدعم الماسح المدمج (BarcodeDetector)، لذلك يعمل المسح عبر jsQR محلياً وقد يكون أبطأ قليلاً. على iPhone استخدم Safari مع HTTPS.',
            'Your browser does not support the native BarcodeDetector, so scanning runs locally through jsQR and may be slightly slower. On iPhone use Safari over HTTPS.'
          )}
        </HintCard>
      ) : null}

      <HintCard icon="shield">
        {t(
          'لا تُرفع الكاميرا ولا الصور إلى أي خادم — كل المعالجة تحدث على جهازك.',
          'Neither the camera feed nor your images are uploaded — everything is processed on your device.'
        )}
      </HintCard>
    </div>
  );
}
