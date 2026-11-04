import { useEffect, useState } from 'react';
import { Icon } from './icons';
import { Button, IconButton, Sheet } from './ui';
import { useI18n } from '../lib/i18n';
import { useSettings, updateSettings } from '../lib/settings';
import { promptInstall, useInstallState } from '../lib/install';
import { isIos, isStandalone } from '../lib/format';
import { toast } from '../lib/toast';

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (isIos()) return true;
  return navigator.maxTouchPoints > 0 && window.matchMedia?.('(pointer: coarse)').matches === true;
}

export function InstallBanner() {
  const { t } = useI18n();
  const settings = useSettings();
  const install = useInstallState();
  const [iosSheet, setIosSheet] = useState(false);
  const [ready, setReady] = useState(false);
  const standalone = isStandalone();

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready || standalone || install.installed || settings.installBannerDismissed) return null;
  if (!install.canInstall && !install.ios) return null;
  // Desktop users install from the browser menu when they want to; the banner
  // is reserved for phones where it is genuinely useful.
  if (!isMobileDevice()) return null;

  const onClick = async () => {
    if (install.canInstall) {
      const result = await promptInstall();
      if (result === 'accepted') {
        toast(t('جارٍ تثبيت التطبيق…', 'Installing the app…'), 'success');
        updateSettings({ installBannerDismissed: true });
      }
    } else {
      setIosSheet(true);
    }
  };

  return (
    <>
      <div className="install-banner" role="region" aria-label={t('تثبيت التطبيق', 'Install app')}>
        <div className="brand-mark" style={{ width: 38, height: 38, flexShrink: 0 }}>
          <Icon name="install" size={19} />
        </div>
        <div className="grow">
          <b style={{ display: 'block', fontSize: 12 }}>{t('ثبّت واتساب المباشر', 'Install Direct WhatsApp')}</b>
          <span className="text-muted" style={{ fontSize: 10.5 }}>
            {t('يعمل أوفلاين ويُفتح بسرعة من الشاشة الرئيسية.', 'Works offline and opens fast from your home screen.')}
          </span>
        </div>
        <Button size="sm" variant="primary" onClick={onClick}>
          {t('تثبيت', 'Install')}
        </Button>
        <IconButton name="x" label={t('إخفاء', 'Dismiss')} variant="plain" size={16} onClick={() => updateSettings({ installBannerDismissed: true })} />
      </div>

      <Sheet
        open={iosSheet}
        onClose={() => setIosSheet(false)}
        title={t('تثبيت التطبيق على الآيفون', 'Install on iPhone')}
        footer={
          <Button variant="primary" block onClick={() => setIosSheet(false)}>
            {t('فهمت', 'Got it')}
          </Button>
        }
      >
        <ol style={{ margin: 0, paddingInlineStart: 18, lineHeight: 2, fontSize: 13 }}>
          <li>{t('افتح هذه الصفحة في متصفح Safari.', 'Open this page in Safari.')}</li>
          <li>{t('اضغط زر المشاركة في أسفل الشاشة.', 'Tap the Share button at the bottom.')}</li>
          <li>{t('اختر «إضافة إلى الشاشة الرئيسية».', 'Choose “Add to Home Screen”.')}</li>
          <li>{t('اضغط «إضافة» لتثبيت التطبيق.', 'Tap “Add” to install.')}</li>
        </ol>
        <p className="page-sub" style={{ margin: 0 }}>
          {t('ملاحظة: بعض ميزات الكاميرا والقراءة قد تختلف على iOS حسب إصدار النظام.', 'Note: camera and scanning features may vary on iOS by system version.')}
        </p>
      </Sheet>
    </>
  );
}
