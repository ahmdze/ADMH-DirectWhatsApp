import { useMemo, useState, type CSSProperties } from 'react';
import { Icon } from '../../components/icons';
import { Button, Chip, ConfirmSheet, EmptyState, IconButton, ScreenHeader, Segmented, Spinner } from '../../components/ui';
import { useActiveWorkspace, useTemplates } from '../../hooks/useData';
import { deleteTemplate, updateTemplate } from '../../lib/db';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import { setDraft } from '../../lib/launch';
import { navigate } from '../../lib/router';
import { templateVariables } from '../../lib/template';
import { toast } from '../../lib/toast';
import type { Template } from '../../types';
import { TemplateSheet } from './TemplateSheet';
import { TemplateVarsSheet } from './TemplateVarsSheet';

type ViewMode = 'list' | 'grid';

function clampLines(lines: number): CSSProperties {
  return { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' };
}

/** Ready-made message templates with variables. */
export function TemplatesScreen() {
  const { t, locale, rel } = useI18n();
  const workspace = useActiveWorkspace();
  const templates = useTemplates(workspace?.id);

  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [varsFor, setVarsFor] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  const titleOf = (template: Template) => (locale === 'en' ? template.titleEn || template.title : template.title);
  const bodyOf = (template: Template) => (locale === 'en' ? template.bodyEn || template.body : template.body);

  const tags = useMemo(() => {
    const found = new Set<string>();
    for (const template of templates) {
      for (const tag of template.tags || []) found.add(tag);
    }
    return [...found].slice(0, 16);
  }, [templates]);

  const term = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return templates.filter((template) => {
      if (activeTag && !(template.tags || []).includes(activeTag)) return false;
      if (!term) return true;
      const title = locale === 'en' ? template.titleEn || template.title : template.title;
      const body = locale === 'en' ? template.bodyEn || template.body : template.body;
      return [title, body, ...(template.tags || [])].some((value) => value.toLowerCase().includes(term));
    });
  }, [templates, activeTag, term, locale]);

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (template: Template) => {
    setEditing(template);
    setSheetOpen(true);
  };

  const openComposeWith = async (template: Template, text: string) => {
    try {
      await updateTemplate(template.id, { lastUsedAt: Date.now() });
    } catch {
      /* last-used tracking is best-effort */
    }
    setDraft({ raw: '', message: text });
    navigate('/compose');
    hapticSuccess();
    toast(t('تم إدراج القالب في شاشة الإرسال', 'Template inserted into compose'), 'success');
  };

  const useTemplate = (template: Template) => {
    const text = bodyOf(template);
    if (templateVariables(text).length) {
      setVarsFor(template);
      return;
    }
    void openComposeWith(template, text);
  };

  const removeTemplate = async (id: string) => {
    try {
      await deleteTemplate(id);
      toast(t('تم حذف القالب', 'Template deleted'), 'success');
      hapticSuccess();
    } catch {
      toast(t('تعذّر حذف القالب', 'Could not delete the template'), 'error');
      hapticError();
    }
  };

  if (!workspace) {
    return (
      <div className="screen">
        <ScreenHeader title={t('القوالب', 'Templates')} subtitle={t('جارٍ تحميل بياناتك المحلية…', 'Loading your local data…')} />
        <div className="row" style={{ justifyContent: 'center', padding: 28 }}>
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeader
        title={t('القوالب', 'Templates')}
        subtitle={t('ردود جاهزة بمتغيّرات — أدرجها في الإرسال بلمسة.', 'Ready replies with variables — insert one into compose in a tap.')}
        action={
          <Button variant="soft" size="sm" onClick={openNew}>
            <Icon name="plus" size={16} />
            {t('جديد', 'New')}
          </Button>
        }
      />

      <input
        className="control"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('ابحث في القوالب', 'Search templates')}
        aria-label={t('بحث القوالب', 'Search templates')}
        inputMode="search"
        autoComplete="off"
      />

      {tags.length ? (
        <div className="chip-row">
          <Chip active={activeTag === null} onClick={() => setActiveTag(null)}>
            {t('الكل', 'All')}
          </Chip>
          {tags.map((tag) => (
            <Chip key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="row-between">
        <span className="section-title">{t('كل القوالب', 'All templates')}</span>
        <div style={{ width: 148 }}>
          <Segmented<ViewMode>
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: t('قائمة', 'List') },
              { value: 'grid', label: t('شبكة', 'Grid') }
            ]}
          />
        </div>
      </div>

      {filtered.length ? (
        view === 'list' ? (
          <div className="col" style={{ gap: 10 }}>
            {filtered.map((template) => (
              <article key={template.id} className="glass" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="row" style={{ gap: 6, alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, flex: 1, minWidth: 0 }}>{titleOf(template)}</h3>
                  {template.builtin ? <span className="badge accent">{t('مدمج', 'Built-in')}</span> : null}
                </div>
                <p className="page-sub" style={{ margin: 0, ...clampLines(2) }}>
                  {bodyOf(template)}
                </p>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {template.tags.map((tag) => (
                    <span key={tag} className="badge">
                      {tag}
                    </span>
                  ))}
                  {template.lastUsedAt ? (
                    <span className="text-muted" style={{ fontSize: 10.5 }}>
                      {rel(template.lastUsedAt)}
                    </span>
                  ) : null}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Button variant="soft" size="sm" className="grow" onClick={() => useTemplate(template)}>
                    <Icon name="send" size={15} />
                    {t('استخدام', 'Use')}
                  </Button>
                  <IconButton name="edit" label={t('تعديل القالب', 'Edit template')} variant="plain" size={17} onClick={() => openEdit(template)} />
                  <IconButton
                    name="trash"
                    label={t('حذف القالب', 'Delete template')}
                    variant="plain"
                    size={17}
                    onClick={() => setDeleteTarget(template)}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid-2">
            {filtered.map((template) => (
              <article
                key={template.id}
                className="glass"
                style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}
              >
                <button
                  type="button"
                  onClick={() => openEdit(template)}
                  style={{ textAlign: 'start', color: 'inherit', minHeight: 44 }}
                  aria-label={`${t('تعديل القالب', 'Edit template')}: ${titleOf(template)}`}
                >
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, ...clampLines(2) }}>{titleOf(template)}</span>
                </button>
                <p className="page-sub" style={{ margin: 0, ...clampLines(3) }}>
                  {bodyOf(template)}
                </p>
                <div className="row" style={{ gap: 6, marginTop: 'auto' }}>
                  <Button variant="soft" size="sm" className="grow" onClick={() => useTemplate(template)}>
                    {t('استخدام', 'Use')}
                  </Button>
                  <IconButton
                    name="trash"
                    label={t('حذف القالب', 'Delete template')}
                    variant="plain"
                    size={16}
                    onClick={() => setDeleteTarget(template)}
                  />
                </div>
              </article>
            ))}
          </div>
        )
      ) : (
        <EmptyState
          icon={term || activeTag ? 'search' : 'fileText'}
          title={term || activeTag ? t('لا نتائج مطابقة', 'No matching results') : t('لا قوالب بعد', 'No templates yet')}
          description={
            term || activeTag
              ? t('جرّب كلمة أخرى أو أزل فلتر الوسم.', 'Try another word or clear the tag filter.')
              : t('أنشئ قالباً لتردّ على العملاء بنفس الرسالة كل مرة.', 'Create a template to reply with the same message every time.')
          }
          action={
            term || activeTag ? (
              <Button
                variant="soft"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setActiveTag(null);
                }}
              >
                {t('مسح الفلاتر', 'Clear filters')}
              </Button>
            ) : (
              <Button variant="soft" size="sm" onClick={openNew}>
                <Icon name="plus" size={16} />
                {t('قالب جديد', 'New template')}
              </Button>
            )
          }
        />
      )}

      <TemplateSheet open={sheetOpen} onClose={() => setSheetOpen(false)} workspaceId={workspace.id} template={editing} />

      <TemplateVarsSheet
        open={Boolean(varsFor)}
        onClose={() => setVarsFor(null)}
        template={varsFor}
        onApply={(text) => {
          const template = varsFor;
          if (template) void openComposeWith(template, text);
        }}
      />

      <ConfirmSheet
        open={Boolean(deleteTarget)}
        title={t('حذف القالب؟', 'Delete this template?')}
        description={deleteTarget ? titleOf(deleteTarget) : undefined}
        confirmLabel={t('حذف', 'Delete')}
        danger
        onConfirm={() => {
          if (deleteTarget) void removeTemplate(deleteTarget.id);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
