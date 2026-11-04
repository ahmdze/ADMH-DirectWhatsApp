import { useRef } from 'react';
import { Button, IconButton } from '../../components/ui';
import { Icon } from '../../components/icons';
import { useI18n } from '../../lib/i18n';
import { formatBytes } from '../../lib/image';
import type { MediaAttachment } from '../../lib/media';

interface ComposeMediaProps {
  items: MediaAttachment[];
  busy: boolean;
  error: string | null;
  locationBusy: boolean;
  onFiles: (files: FileList) => void;
  onContact: () => void;
  onLocation: () => void;
  onRemove: (id: string) => void;
}

/** Session-only attachment tray shown inside Compose. */
export function ComposeMedia({ items, busy, error, locationBusy, onFiles, onContact, onLocation, onRemove }: ComposeMediaProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="col" style={{ gap: 9 }}>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.vcf,text/vcard"
        style={{ display: 'none' }}
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
        <Button variant="soft" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
          <Icon name="image" size={16} />
          {t('إرفاق ملف', 'Attach file')}
        </Button>
        <Button variant="soft" size="sm" onClick={onContact}>
          <Icon name="contact" size={16} />
          {t('جهة اتصال', 'Contact')}
        </Button>
        <Button variant="soft" size="sm" loading={locationBusy} onClick={onLocation}>
          <Icon name="link" size={16} />
          {locationBusy ? t('جارٍ تحديد الموقع…', 'Locating…') : t('الموقع', 'Location')}
        </Button>
      </div>

      {items.length ? (
        <div className="col" style={{ gap: 7 }}>
          {items.map((item) => (
            <div
              key={item.id}
              className="glass-soft"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 13 }}
            >
              {item.kind === 'image' ? (
                <img
                  src={item.url}
                  alt={item.name}
                  style={{ width: 46, height: 46, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <span className="avatar" style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0 }}>
                  <Icon name={item.kind === 'vcard' ? 'contact' : 'fileText'} size={17} />
                </span>
              )}
              <div className="list-main" style={{ minWidth: 0 }}>
                <span className="list-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
                <span className="list-sub">
                  {formatBytes(item.size)} · {item.mime}
                </span>
              </div>
              <IconButton name="x" label={t('إزالة المرفق', 'Remove attachment')} variant="plain" size={17} onClick={() => onRemove(item.id)} />
            </div>
          ))}
        </div>
      ) : null}

      <p className="field-hint" style={{ margin: 0 }}>
        {t(
          'تُشارك المرفقات عبر نافذة مشاركة النظام؛ اختر واتساب والمحادثة يدوياً. لا يُخزّن التطبيق أي مرفق.',
          'Attachments are shared through the system share sheet; pick WhatsApp and the chat manually. The app never stores them.'
        )}
      </p>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
