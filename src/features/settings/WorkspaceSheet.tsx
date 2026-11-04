import { useEffect, useState } from 'react';
import { Button, Field, Sheet } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { useSettings } from '../../lib/settings';
import { createWorkspace } from '../../lib/db';
import { toast } from '../../lib/toast';
import { hapticSuccess } from '../../lib/haptics';
import type { Workspace } from '../../types';

interface WorkspaceSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated: (workspace: Workspace) => void;
}

/** Create a new workspace with an Arabic + English display name. */
export function WorkspaceSheet({ open, onClose, onCreated }: WorkspaceSheetProps) {
  const { t } = useI18n();
  const settings = useSettings();
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setNameEn('');
    setError(null);
    setBusy(false);
  }, [open]);

  const submit = async () => {
    if (busy) return;
    const trimmedName = name.trim();
    const trimmedNameEn = nameEn.trim();
    if (!trimmedName) {
      setError(t('أدخل اسماً لمساحة العمل.', 'Enter a workspace name.'));
      return;
    }
    if (trimmedName.length > 40 || trimmedNameEn.length > 40) {
      setError(t('الاسم طويل جداً (40 حرفاً كحد أقصى).', 'The name is too long (40 characters max).'));
      return;
    }
    setBusy(true);
    try {
      const workspace = await createWorkspace(trimmedName, trimmedNameEn || trimmedName);
      if (settings.haptics) hapticSuccess();
      toast(t('تمت إضافة مساحة العمل.', 'Workspace added.'), 'success');
      onCreated(workspace);
      onClose();
    } catch {
      toast(t('تعذّر إنشاء مساحة العمل. حاول مجدداً.', 'Could not create the workspace. Please try again.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('مساحة عمل جديدة', 'New workspace')}
      subtitle={t('افصل وجهاتك وقوالبك حسب النشاط.', 'Keep destinations and templates separate per activity.')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('إلغاء', 'Cancel')}
          </Button>
          <Button variant="primary" loading={busy} onClick={() => void submit()}>
            {t('إضافة', 'Add')}
          </Button>
        </>
      }
    >
      <Field label={t('الاسم بالعربية', 'Arabic name')} counter={`${name.length}/40`}>
        <input
          className="control"
          value={name}
          maxLength={40}
          placeholder={t('مثال: متجر', 'e.g. Store')}
          onChange={(event) => {
            setError(null);
            setName(event.target.value);
          }}
        />
      </Field>
      <Field label={t('الاسم بالإنجليزية', 'English name')} hint={t('اختياري، يُستخدم عند التبديل للإنجليزية.', 'Optional, shown when the app language is English.')} counter={`${nameEn.length}/40`}>
        <input
          className="control"
          dir="ltr"
          value={nameEn}
          maxLength={40}
          placeholder={t('مثال: Store', 'e.g. Store')}
          onChange={(event) => {
            setError(null);
            setNameEn(event.target.value);
          }}
        />
      </Field>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}
