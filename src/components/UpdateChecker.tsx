import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import { Button, HintCard, IconButton, Sheet } from './ui';
import {
  checkForAppUpdate,
  dismissUpdateVersion,
  getDismissedUpdateVersion,
  isUpdateCheckSupported,
  type AppUpdateInfo
} from '../lib/appUpdate';
import {
  downloadAppUpdate,
  installDownloadedUpdate,
  type DownloadedUpdate,
  type UpdateDownloadProgress
} from '../lib/updateDownload';
import { hapticError, hapticSuccess, hapticTap } from '../lib/haptics';
import { useI18n } from '../lib/i18n';
import { toast } from '../lib/toast';

/** Wait a moment after launch so the first screen stays fast. */
const FIRST_CHECK_DELAY_MS = 4000;

function formatDownloadSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Aurora banner shown inside the Capacitor Android shell when GitHub Releases
 * has a newer APK. Tapping Download streams the APK inside the app with a
 * progress bar, then hands the file to Android's package installer (the user
 * still confirms the install).
 */
export function UpdateChecker() {
  const { t } = useI18n();
  const [info, setInfo] = useState<AppUpdateInfo | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(() => getDismissedUpdateVersion());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'downloading' | 'ready' | 'opening' | 'error'>('idle');
  const [progress, setProgress] = useState<UpdateDownloadProgress>({ bytes: 0, total: 0, percent: null });
  const [downloaded, setDownloaded] = useState<DownloadedUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const check = useCallback(async (force: boolean) => {
    if (!isUpdateCheckSupported() || inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await checkForAppUpdate({ force });
      if (mounted.current) setInfo(next);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isUpdateCheckSupported()) return;
    const timer = window.setTimeout(() => {
      void check(false);
    }, FIRST_CHECK_DELAY_MS);
    const onOnline = () => {
      void check(false);
    };
    window.addEventListener('online', onOnline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('online', onOnline);
    };
  }, [check]);

  const openExternal = async (url: string) => {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const beginDownload = async () => {
    if (!info) return;
    if (!info.apkUrl) {
      await openExternal(info.releaseUrl);
      return;
    }
    setSheetOpen(true);
    setPhase('downloading');
    setError(null);
    setDownloaded(null);
    setProgress({ bytes: 0, total: 0, percent: null });
    hapticTap();
    try {
      const file = await downloadAppUpdate(info, (next) => {
        if (mounted.current) setProgress(next);
      });
      if (!mounted.current) return;
      setDownloaded(file);
      setPhase('ready');
      hapticSuccess();
    } catch {
      if (!mounted.current) return;
      setPhase('error');
      setError(t('تعذّر تنزيل التحديث. تحقّق من الاتصال وحاول مجدداً.', 'Could not download the update. Check your connection and try again.'));
      hapticError();
    }
  };

  const install = async () => {
    if (!downloaded || phase === 'opening') return;
    setPhase('opening');
    setError(null);
    try {
      await installDownloadedUpdate(downloaded);
      setSheetOpen(false);
      setPhase('idle');
      toast(t('أكمل التثبيت من نافذة Android.', 'Finish the install from the Android prompt.'), 'success');
    } catch {
      setPhase('error');
      setError(
        t(
          'تعذّر فتح مثبّت Android. اسمح لـ«واتساب المباشر» بتثبيت التطبيقات من الإعدادات ثم أعد المحاولة.',
          'Could not open the Android installer. Allow “Direct WhatsApp” to install apps in system settings, then try again.'
        )
      );
      hapticError();
    }
  };

  const postpone = () => {
    if (!info) return;
    dismissUpdateVersion(info.latestVersion);
    setDismissedVersion(info.latestVersion);
    hapticTap();
  };

  const closeSheet = () => {
    if (phase === 'downloading' || phase === 'opening') return;
    setSheetOpen(false);
  };

  if (!isUpdateCheckSupported()) return null;
  if (!info || !info.updateAvailable) return null;
  if (info.latestVersion === dismissedVersion) return null;

  const published = info.publishedAt ? new Date(info.publishedAt) : null;
  const publishedAt = published && !Number.isNaN(published.getTime()) ? published.toISOString().slice(0, 10) : null;
  const percent = progress.percent;
  const ready = phase === 'ready' && downloaded !== null;

  return (
    <>
      <div className="update-banner" role="status" aria-live="polite">
        <span className="brand-mark" aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 12, flexShrink: 0 }}>
          <Icon name={ready ? 'check' : 'download'} size={17} />
        </span>
        <div className="grow">
          <b style={{ display: 'block', fontSize: 12 }}>
            {ready ? t('التحديث جاهز للتثبيت', 'Update ready to install') : t('يتوفر تحديث للتطبيق', 'An app update is available')}
          </b>
          <span className="text-muted" style={{ fontSize: 10.5 }}>
            <span dir="ltr">
              v{info.currentVersion} → v{info.latestVersion}
            </span>
            {publishedAt ? ` · ${publishedAt}` : null}
            {' · '}
            {ready ? t('افتح المثبّت لإكمال التحديث', 'Open the installer to finish') : t('تنزيل داخل التطبيق ثم تثبيت بموافقتك', 'Download in-app, then install with your approval')}
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (ready) setSheetOpen(true);
            else void beginDownload();
          }}
          aria-label={ready ? t('تثبيت التحديث', 'Install update') : t('تحميل التحديث (APK)', 'Download the update (APK)')}
        >
          {ready ? t('تثبيت', 'Install') : t('تحميل', 'Download')}
        </Button>
        <IconButton name="x" label={t('لاحقاً', 'Later')} variant="plain" size={16} onClick={postpone} />
      </div>

      <Sheet
        open={sheetOpen}
        onClose={closeSheet}
        title={t('تحديث التطبيق', 'App update')}
        subtitle={t(`الإصدار ${info.latestVersion} متاح`, `Version ${info.latestVersion} is available`)}
        closeLabel={t('إغلاق', 'Close')}
      >
        <div className="col" style={{ gap: 14 }}>
          {phase === 'downloading' ? (
            <>
              <div className="row-between" style={{ gap: 10 }}>
                <b style={{ fontSize: 13 }}>{t('جارٍ تنزيل ملف APK…', 'Downloading the APK…')}</b>
                <span className="badge accent">
                  {percent !== null ? `${percent}%` : `${formatDownloadSize(progress.bytes)}`}
                </span>
              </div>
              <div
                aria-hidden="true"
                style={{ height: 8, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}
              >
                <div
                  style={{
                    width: `${percent ?? 8}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: 'var(--accent)',
                    transition: 'width 0.2s ease'
                  }}
                />
              </div>
              <p className="page-sub" style={{ margin: 0, fontSize: 11.5 }}>
                {progress.total > 0
                  ? t(
                      `${formatDownloadSize(progress.bytes)} من ${formatDownloadSize(progress.total)}`,
                      `${formatDownloadSize(progress.bytes)} of ${formatDownloadSize(progress.total)}`
                    )
                  : t('يبدأ التنزيل…', 'Starting the download…')}
              </p>
              <p className="page-sub" style={{ margin: 0, fontSize: 11 }}>
                {t('لا تغلق التطبيق حتى يكتمل التنزيل.', 'Keep the app open until the download finishes.')}
              </p>
            </>
          ) : null}

          {phase === 'ready' && downloaded ? (
            <>
              <HintCard icon="check">
                {t('اكتمل تنزيل التحديث. اضغط «تثبيت الآن» ثم أكّد التثبيت من نافذة Android.', 'The update finished downloading. Tap “Install now”, then confirm in the Android prompt.')}
              </HintCard>
              <Button variant="primary" block onClick={() => void install()}>
                <Icon name="download" size={16} />
                {t('تثبيت الآن', 'Install now')}
              </Button>
              <p className="page-sub" style={{ margin: 0, fontSize: 11 }}>
                {t(
                  'قد يطلب Android السماح بالتثبيت من هذا المصدر. بياناتك وإعداداتك ستبقى بعد التحديث.',
                  'Android may ask you to allow installs from this source. Your data and settings stay after the update.'
                )}
              </p>
            </>
          ) : null}

          {phase === 'error' ? (
            <>
              <HintCard icon="alert">{error ?? t('تعذّر إكمال التحديث.', 'Could not complete the update.')}</HintCard>
              <Button variant="soft" block onClick={() => void beginDownload()}>
                <Icon name="refresh" size={16} />
                {t('إعادة المحاولة', 'Try again')}
              </Button>
              <Button
                variant="ghost"
                block
                onClick={() => {
                  void openExternal(info.releaseUrl);
                  setSheetOpen(false);
                }}
              >
                {t('فتح صفحة الإصدار', 'Open the release page')}
              </Button>
            </>
          ) : null}

          {phase === 'opening' ? (
            <p className="page-sub" style={{ margin: 0, fontSize: 12 }}>
              {t('جارٍ فتح مثبّت Android…', 'Opening the Android installer…')}
            </p>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
