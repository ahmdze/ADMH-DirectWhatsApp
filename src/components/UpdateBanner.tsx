import { useState } from 'react';
import { Button, IconButton } from './ui';
import { useI18n } from '../lib/i18n';
import { dismissUpdate, updateApp, usePwaState } from '../lib/pwa';

export function UpdateBanner() {
  const { t } = useI18n();
  const { needRefresh } = usePwaState();
  const [busy, setBusy] = useState(false);
  if (!needRefresh) return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <div className="grow">
        <b style={{ display: 'block', fontSize: 12 }}>{t('يتوفر إصدار جديد', 'A new version is available')}</b>
        <span className="text-muted" style={{ fontSize: 10.5 }}>
          {t('حدّث الآن للاستفادة من أحدث التحسينات.', 'Update now to get the latest improvements.')}
        </span>
      </div>
      <Button
        size="sm"
        variant="primary"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          await updateApp();
        }}
      >
        {t('تحديث الآن', 'Update')}
      </Button>
      <IconButton name="x" label={t('لاحقاً', 'Later')} variant="plain" size={16} onClick={dismissUpdate} />
    </div>
  );
}
