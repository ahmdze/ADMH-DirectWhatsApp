import { useMemo } from 'react';
import { Icon } from '../../components/icons';
import { useI18n } from '../../lib/i18n';
import { initials } from '../../lib/format';
import type { MediaAttachment } from '../../lib/media';
import type { Target } from '../../types';

interface ComposePreviewProps {
  target: Target | null;
  message: string;
  media: MediaAttachment[];
}

function firstLink(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i);
  if (!match) return null;
  try {
    return new URL(match[0]).hostname;
  } catch {
    return null;
  }
}

/** Local, offline WhatsApp-like bubble preview. No link fetching or tracking. */
export function ComposePreview({ target, message, media }: ComposePreviewProps) {
  const { t } = useI18n();
  const domain = useMemo(() => firstLink(message), [message]);
  if (!target && !message.trim() && !media.length) return null;

  return (
    <div className="glass-soft" style={{ padding: 12, borderRadius: 16 }}>
      <div className="row" style={{ gap: 9, alignItems: 'flex-start' }}>
        <span className="avatar" style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0 }}>
          {target ? initials(target.display) : <Icon name="chat" size={16} />}
        </span>
        <div className="col" style={{ gap: 4, minWidth: 0, flex: 1 }}>
          <div className="row-between" style={{ gap: 8 }}>
            <b style={{ fontSize: 12 }} dir="ltr">
              {target?.display || t('بدون وجهة بعد', 'No destination yet')}
            </b>
            <span className="list-sub" style={{ fontSize: 9.5 }}>
              {t('معاينة محلية', 'Local preview')}
            </span>
          </div>
          {message.trim() ? (
            <div
              style={{
                background: 'var(--accent-soft)',
                borderRadius: '3px 13px 13px 13px',
                padding: '8px 10px',
                fontSize: 12,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
              dir="auto"
            >
              {message}
              {domain ? (
                <span className="list-sub" style={{ display: 'block', marginTop: 4, fontSize: 9.5 }} dir="ltr">
                  <Icon name="link" size={10} /> {domain}
                </span>
              ) : null}
            </div>
          ) : null}
          {media.length ? (
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {media.map((item) =>
                item.kind === 'image' ? (
                  <img key={item.id} src={item.url} alt={item.name} style={{ width: 58, height: 58, borderRadius: 10, objectFit: 'cover' }} />
                ) : (
                  <span key={item.id} className="badge">
                    <Icon name={item.kind === 'vcard' ? 'contact' : 'fileText'} size={12} /> {item.name}
                  </span>
                )
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
