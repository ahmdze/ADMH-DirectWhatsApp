import { useEffect, useRef, useState } from 'react';
import { Button, Chip, Field, Sheet } from '../../components/ui';
import { addTemplate, updateTemplate } from '../../lib/db';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { Template } from '../../types';

export interface TemplateSheetProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string | null;
  template: Template | null;
}

const BODY_LIMIT = 1000;

const VARIABLES = ['الاسم', 'الجهة', 'التاريخ'] as const;

function parseTags(value: string): string[] {
  return value
    .split(/[,،]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

/** Create or edit a message template with {الاسم} {الجهة} {التاريخ} variables. */
export function TemplateSheet({ open, onClose, workspaceId, template }: TemplateSheetProps) {
  const { t, n } = useI18n();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(template?.title ?? '');
    setBody(template?.body ?? '');
    setTags((template?.tags ?? []).join('، '));
    setError(null);
    setSaving(false);
    // Reset only when the sheet (re)opens or the edited template changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template?.id]);

  const insertVariable = (name: (typeof VARIABLES)[number]) => {
    const token = `{${name}}`;
    const area = bodyRef.current;
    if (!area) {
      setBody((current) => (current + token).slice(0, BODY_LIMIT));
      return;
    }
    const start = area.selectionStart ?? body.length;
    const end = area.selectionEnd ?? start;
    const next = (body.slice(0, start) + token + body.slice(end)).slice(0, BODY_LIMIT);
    setBody(next);
    window.requestAnimationFrame(() => {
      area.focus();
      const position = Math.min(start + token.length, next.length);
      area.setSelectionRange(position, position);
    });
  };

  const save = async () => {
    if (!workspaceId) {
      setError(t('لا توجد مساحة عمل نشطة.', 'No active workspace.'));
      return;
    }
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle) {
      setError(t('أدخل عنواناً للقالب.', 'Enter a template title.'));
      hapticError();
      return;
    }
    if (!cleanBody) {
      setError(t('أدخل نص القالب.', 'Enter the template body.'));
      hapticError();
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const tagList = parseTags(tags);
      if (template) {
        await updateTemplate(template.id, { title: cleanTitle.slice(0, 60), body: cleanBody, tags: tagList });
        toast(t('تم تحديث القالب', 'Template updated'), 'success');
      } else {
        await addTemplate({ workspaceId, title: cleanTitle.slice(0, 60), body: cleanBody, tags: tagList });
        toast(t('تم إنشاء القالب', 'Template created'), 'success');
      }
      hapticSuccess();
      onClose();
    } catch {
      toast(t('تعذّر حفظ القالب', 'Could not save the template'), 'error');
      hapticError();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={template ? t('تعديل القالب', 'Edit template') : t('قالب جديد', 'New template')}
      subtitle={t('تُحفظ على جهازك فقط.', 'Stored on your device only.')}
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
      <Field label={t('العنوان', 'Title')}>
        <input
          className="control"
          value={title}
          maxLength={60}
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) setError(null);
          }}
          placeholder={t('مثال: ترحيب سريع', 'e.g. Quick greeting')}
        />
      </Field>

      <Field label={t('نص القالب', 'Template body')} counter={`${n(body.length)}/${BODY_LIMIT}`} error={error ?? undefined}>
        <textarea
          ref={bodyRef}
          className={`control ${error ? 'error' : ''}`}
          value={body}
          maxLength={BODY_LIMIT}
          onChange={(event) => {
            setBody(event.target.value);
            if (error) setError(null);
          }}
          placeholder={t('مرحباً {الاسم}، شكراً لتواصلك مع {الجهة}.', 'Hello {name}, thanks for contacting {company}.')}
          style={{ minHeight: 120 }}
        />
      </Field>

      <div className="col" style={{ gap: 6 }}>
        <span className="field-label">{t('إدراج متغيّر', 'Insert a variable')}</span>
        <div className="chip-row">
          {VARIABLES.map((name) => (
            <Chip key={name} onClick={() => insertVariable(name)} title={t(`إدراج ${name}`, `Insert ${name}`)}>
              {`{${name}}`}
            </Chip>
          ))}
        </div>
        <p className="field-hint">
          {t(
            'تُستبدل المتغيّرات عند الاستخدام، مع بقاء التاريخ جاهزاً اليوم.',
            'Variables are filled in when the template is used, with today’s date pre-filled.'
          )}
        </p>
      </div>

      <Field label={t('وسوم', 'Tags')} hint={t('افصل بين الوسوم بفاصلة.', 'Separate tags with commas.')}>
        <input
          className="control"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder={t('عام، عمل، مبيعات', 'general, work, sales')}
        />
      </Field>
    </Sheet>
  );
}
