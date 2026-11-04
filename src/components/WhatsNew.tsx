import { Icon } from './icons';
import { Button, Sheet } from './ui';
import { useI18n } from '../lib/i18n';
import { APP_VERSION, CHANGELOG } from '../lib/changelog';

export function WhatsNew({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const latest = CHANGELOG[0];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('ما الجديد', 'What’s new')}
      subtitle={`${t('الإصدار', 'Version')} ${APP_VERSION}`}
      footer={
        <Button variant="primary" block onClick={onClose}>
          {t('ابدأ الاستخدام', 'Start using the app')}
        </Button>
      }
    >
      <div className="list" style={{ gap: 2 }}>
        {latest.items.map((item) => (
          <div key={item.ar} className="list-row" style={{ alignItems: 'flex-start', paddingInline: 2 }}>
            <span className="avatar" style={{ width: 28, height: 28, borderRadius: 10, marginTop: 2 }} aria-hidden="true">
              <Icon name="check" size={14} />
            </span>
            <span className="list-main">
              <span className="list-title" style={{ whiteSpace: 'normal', fontSize: 12.5, lineHeight: 1.65 }}>
                {t(item.ar, item.en)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
