import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import { IconButton } from './ui';
import {
  checkForAppUpdate,
  dismissUpdateVersion,
  getDismissedUpdateVersion,
  isUpdateCheckSupported,
  type AppUpdateInfo
} from '../lib/appUpdate';
import { hapticTap } from '../lib/haptics';
import { useI18n } from '../lib/i18n';

/** Wait a moment after launch so the first screen stays fast. */
const FIRST_CHECK_DELAY_MS = 4000;

/**
 * Aurora banner shown inside the Capacitor Android shell when GitHub Releases
 * has a newer APK. Renders nothing on the web and nothing when up to date.
 *
 * The parent app shell owns the mount point; this component only reads the
 * native flag and asks `lib/appUpdate` (which never touches the network on the
 * web) for the latest release.
 */
export function UpdateChecker() {
  const { t, date } = useI18n();
  const [info, setInfo] = useState<AppUpdateInfo | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(() => getDismissedUpdateVersion());
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

  const postpone = () => {
    if (!info) return;
    dismissUpdateVersion(info.latestVersion);
    setDismissedVersion(info.latestVersion);
    hapticTap();
  };

  const openUpdate = async (url: string) => {
    hapticTap();
    try {
      // Open the release/APK in the system browser instead of navigating the
      // Capacitor WebView away from the app.
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isUpdateCheckSupported()) return null;
  if (!info || !info.updateAvailable) return null;
  if (info.latestVersion === dismissedVersion) return null;

  const downloadUrl = info.apkUrl ?? info.releaseUrl;
  const published = info.publishedAt ? new Date(info.publishedAt) : null;
  const publishedAt = published && !Number.isNaN(published.getTime()) ? published.getTime() : null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span className="brand-mark" aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 12, flexShrink: 0 }}>
        <Icon name="download" size={17} />
      </span>
      <div className="grow">
        <b style={{ display: 'block', fontSize: 12 }}>{t('يتوفر تحديث للتطبيق', 'An app update is available')}</b>
        <span className="text-muted" style={{ fontSize: 10.5 }}>
          <span dir="ltr">
            v{info.currentVersion} → v{info.latestVersion}
          </span>
          {publishedAt !== null ? ` · ${date(publishedAt)}` : null}
          {' · '}
          {t('ثبّت ملف APK فوق الإصدار الحالي', 'Install the APK over the current version')}
        </span>
      </div>
      <a
        className="btn btn-primary btn-sm"
        href={downloadUrl}
        target="_blank"
        rel="noreferrer noopener"
        onClick={(event) => {
          event.preventDefault();
          void openUpdate(downloadUrl);
        }}
        aria-label={t('تحميل التحديث (APK)', 'Download the update (APK)')}
        style={{ flexShrink: 0 }}
      >
        <Icon name="download" size={15} />
        {t('تحميل', 'Download')}
      </a>
      <IconButton name="x" label={t('لاحقاً', 'Later')} variant="plain" size={16} onClick={postpone} />
    </div>
  );
}
