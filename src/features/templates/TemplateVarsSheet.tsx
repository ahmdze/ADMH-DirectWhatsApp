import { useEffect, useState } from 'react';
import { Button, Field, Sheet } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { applyTemplate, previewTemplate, templateVariables, type TemplateVars } from '../../lib/template';
import type { Template } from '../../types';

export interface TemplateVarsSheetProps {
  open: boolean;
  onClose: () => void;
  template: Template | null;
  onApply: (text: string) => void;
}

const LABELS: Record<keyof TemplateVars, { ar: string; en: string }> = {
  name: { ar: 'الاسم', en: 'Name' },
  company: { ar: 'الجهة', en: 'Company' },
  date: { ar: 'التاريخ', en: 'Date' }
};

function todayLabel(locale: string): string {
  try {
    return new Date().toLocaleDateString(locale === 'en' ? 'en-GB' : 'ar-IQ');
  } catch {
    return new Date().toLocaleDateString();
  }
}

/** Fill the variables of a template before using it in compose. */
export function TemplateVarsSheet({ open, onClose, template, onApply }: TemplateVarsSheetProps) {
  const { t, locale } = useI18n();
  const [vars, setVars] = useState<TemplateVars>({});

  useEffect(() => {
    if (!open) return;
    setVars({ date: todayLabel(locale) });
    // Reset the form whenever the sheet opens for a different template.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template?.id, locale]);

  const body = template ? (locale === 'en' && template.bodyEn ? template.bodyEn : template.body) : '';
  const keys = templateVariables(body);
  const preview = previewTemplate(body, vars, locale);

  const updateVar = (key: keyof TemplateVars, value: string) => {
    setVars((current) => {
      const next: TemplateVars = { ...current };
      next[key] = value;
      return next;
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('املأ المتغيّرات', 'Fill the variables')}
      subtitle={template?.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('إلغاء', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onApply(applyTemplate(body, vars));
              onClose();
            }}
          >
            {t('استخدام القالب', 'Use template')}
          </Button>
        </>
      }
    >
      {keys.length ? (
        keys.map((key) => (
          <Field key={key} label={t(LABELS[key].ar, LABELS[key].en)}>
            <input
              className="control"
              value={vars[key] ?? ''}
              onChange={(event) => updateVar(key, event.target.value)}
              placeholder={key === 'date' ? todayLabel(locale) : ''}
            />
          </Field>
        ))
      ) : (
        <p className="page-sub" style={{ margin: 0 }}>
          {t('لا يحتوي هذا القالب على متغيّرات.', 'This template has no variables.')}
        </p>
      )}

      <div className="col" style={{ gap: 6 }}>
        <span className="field-label">{t('معاينة', 'Preview')}</span>
        <div className="glass-soft" style={{ padding: '12px 14px', whiteSpace: 'pre-wrap', fontSize: 12.5, lineHeight: 1.8 }}>
          {preview}
        </div>
      </div>
    </Sheet>
  );
}
