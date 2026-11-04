import { useEffect, useState } from 'react';
import { Button, Field, Sheet, Switch } from '../../components/ui';
import { addDestination } from '../../lib/db';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { Target } from '../../types';

export interface SaveTargetSheetProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string | null;
  target: Target | null;
}

function parseTags(value: string): string[] {
  return value
    .split(/[,،]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

/** Save the current target into "My destinations". */
export function SaveTargetSheet({ open, onClose, workspaceId, target }: SaveTargetSheetProps) {
  const { t } = useI18n();
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');
  const [favorite, setFavorite] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLabel('');
    setNote('');
    setTags('');
    setFavorite(true);
    setSaving(false);
    setError(null);
  }, [open, target]);

  const save = async () => {
    if (!target) return;
    if (!workspaceId) {
      setError(t('لا توجد مساحة عمل نشطة.', 'No active workspace.'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addDestination({
        workspaceId,
        type: target.type,
        phone: target.type === 'phone' ? target.value : undefined,
        username: target.type === 'username' ? target.value : undefined,
        label: (label.trim() || target.display).slice(0, 80),
        note: note.trim() || undefined,
        tags: parseTags(tags),
        favorite
      });
      toast(t('تم حفظ الوجهة', 'Destination saved'), 'success');
      hapticSuccess();
      onClose();
    } catch {
      toast(t('تعذّر حفظ الوجهة', 'Could not save the destination'), 'error');
      hapticError();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('حفظ الوجهة', 'Save destination')}
      subtitle={target?.display}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('إلغاء', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            loading={saving}
            onClick={() => {
              void save();
            }}
          >
            {t('حفظ', 'Save')}
          </Button>
        </>
      }
    >
      <div className="glass-soft" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span className="list-title" dir="ltr">
          {target?.display ?? ''}
        </span>
        <span className="list-sub">{t('يُحفظ محلياً على جهازك فقط.', 'Stored locally on your device only.')}</span>
      </div>
      <Field label={t('الاسم', 'Name')} hint={t('اتركه فارغاً لاستخدام الوجهة نفسها.', 'Leave empty to use the destination itself.')}>
        <input
          className="control"
          value={label}
          maxLength={80}
          onChange={(event) => setLabel(event.target.value)}
          placeholder={t('مثال: أحمد — المحل', 'e.g. Ahmed — the shop')}
        />
      </Field>
      <Field label={t('ملاحظة', 'Note')}>
        <textarea
          className="control"
          value={note}
          maxLength={280}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('ملاحظة اختيارية', 'Optional note')}
          style={{ minHeight: 70 }}
        />
      </Field>
      <Field label={t('وسوم', 'Tags')} hint={t('افصل بين الوسوم بفاصلة.', 'Separate tags with commas.')}>
        <input
          className="control"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder={t('عميل، عمل، توصيل', 'client, work, delivery')}
        />
      </Field>
      <Switch
        checked={favorite}
        onChange={setFavorite}
        label={t('تثبيت في المفضلة', 'Pin to favorites')}
        description={t('تظهر أولاً في وجهاتي.', 'Shown first in My destinations.')}
      />
      {error ? <p className="field-error">{error}</p> : null}
    </Sheet>
  );
}
