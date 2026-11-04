import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, ConfirmSheet, EmptyState, HintCard, IconButton, ScreenHeader } from '../../components/ui';
import { Icon } from '../../components/icons';
import { useI18n } from '../../lib/i18n';
import { goBack } from '../../lib/router';
import { db } from '../../lib/db';
import { clearTrash, deleteTrash, restoreTrash } from '../../lib/retention';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { toast } from '../../lib/toast';

export function TrashScreen() {
  const { t, date, time } = useI18n();
  const entries = useLiveQuery(() => db.trash.orderBy('deletedAt').reverse().toArray(), [], []);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const restore = async (id: string) => {
    try {
      const ok = await restoreTrash(id);
      if (ok) {
        hapticSuccess();
        toast(t('تمت استعادة السجل.', 'History entry restored.'), 'success');
      } else {
        hapticError();
        toast(t('انتهت مدة الاستعادة لهذا العنصر.', 'This item can no longer be restored.'), 'error');
      }
    } catch {
      hapticError();
      toast(t('تعذّرت استعادة العنصر.', 'Could not restore the item.'), 'error');
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    try {
      await deleteTrash(deleteId);
      hapticSuccess();
      toast(t('تم حذف العنصر نهائياً.', 'Item deleted permanently.'), 'success');
    } catch {
      hapticError();
      toast(t('تعذّر حذف العنصر.', 'Could not delete the item.'), 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const clear = async () => {
    try {
      const count = await clearTrash();
      hapticSuccess();
      toast(
        count ? t(`تم حذف ${count} عنصراً نهائياً.`, `${count} items deleted permanently.`) : t('السلة فارغة.', 'Trash is empty.'),
        'success'
      );
    } catch {
      hapticError();
      toast(t('تعذّر تفريغ السلة.', 'Could not empty the trash.'), 'error');
    } finally {
      setClearOpen(false);
    }
  };

  return (
    <div className="screen">
      <ScreenHeader
        title={t('سلة المحذوفات', 'Trash')}
        subtitle={t('يمكن استعادة عناصر السجل حتى 30 يوماً، ثم تُحذف نهائياً.', 'History items can be restored for 30 days, then they are deleted permanently.')}
        onBack={() => goBack('/settings')}
        action={
          entries.length ? (
            <IconButton name="trash" label={t('تفريغ السلة', 'Empty trash')} onClick={() => setClearOpen(true)} variant="plain" />
          ) : undefined
        }
      />

      <HintCard icon="shield">
        {t(
          'السلة محلية فقط وتُحذف نهائياً بعد انتهاء المدة. لا تُرسل أي بيانات إلى خادم.',
          'The trash is local only and is deleted permanently after it expires. No data is sent to a server.'
        )}
      </HintCard>

      {entries.length ? (
        <div className="col" style={{ gap: 8 }}>
          {entries.map((entry) => (
            <div className="glass card" key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12 }}>
              <span className="avatar" style={{ width: 36, height: 36, borderRadius: 12 }} aria-hidden="true">
                <Icon name="fileText" size={17} />
              </span>
              <div className="list-main" style={{ gap: 2 }}>
                <span className="list-title">{entry.payload.display}</span>
                <span className="list-sub" dir="auto">
                  {entry.payload.messagePreview || t('سجل محادثة', 'Chat history')}
                </span>
                <span className="list-sub">
                  {t('حُذف', 'Deleted')}: {date(entry.deletedAt)} · {time(entry.deletedAt)} — {t('حتى', 'until')}{' '}
                  {date(entry.restoreUntil)}
                </span>
              </div>
              <div className="list-actions">
                <Button size="sm" variant="soft" onClick={() => void restore(entry.id)}>
                  {t('استعادة', 'Restore')}
                </Button>
                <IconButton name="trash" label={t('حذف نهائي', 'Delete permanently')} variant="plain" onClick={() => setDeleteId(entry.id)} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="trash"
          title={t('السلة فارغة', 'Trash is empty')}
          description={t('ستظهر هنا عناصر السجل المحذوفة تلقائياً حسب إعدادات الاحتفاظ.', 'Deleted history items will appear here according to your retention settings.')}
        />
      )}

      <ConfirmSheet
        open={deleteId !== null}
        danger
        title={t('حذف العنصر نهائياً؟', 'Delete permanently?')}
        description={t('لا يمكن استعادة هذا العنصر بعد الحذف.', 'This item cannot be restored after deletion.')}
        confirmLabel={t('حذف', 'Delete')}
        onConfirm={() => void remove()}
        onClose={() => setDeleteId(null)}
      />
      <ConfirmSheet
        open={clearOpen}
        danger
        title={t('تفريغ السلة؟', 'Empty the trash?')}
        description={t('سيُحذف كل ما في السلة نهائياً.', 'Everything in the trash will be deleted permanently.')}
        confirmLabel={t('تفريغ', 'Empty')}
        onConfirm={() => void clear()}
        onClose={() => setClearOpen(false)}
      />
    </div>
  );
}
