import type { Template } from '../types';

export interface TemplateVars {
  name?: string;
  company?: string;
  date?: string;
}

const VAR_PATTERN = /\{(الاسم|الجهة|التاريخ|name|company|date)\}/g;

export function templateVariables(body: string): Array<keyof TemplateVars> {
  const found = new Set<keyof TemplateVars>();
  for (const match of body.matchAll(VAR_PATTERN)) {
    const key = match[1];
    if (key === 'الاسم' || key === 'name') found.add('name');
    else if (key === 'الجهة' || key === 'company') found.add('company');
    else if (key === 'التاريخ' || key === 'date') found.add('date');
  }
  return [...found];
}

export function hasVariables(body: string): boolean {
  return templateVariables(body).length > 0;
}

export function applyTemplate(body: string, vars: TemplateVars): string {
  return body.replace(VAR_PATTERN, (_, key: string) => {
    if (key === 'الاسم' || key === 'name') return vars.name || '';
    if (key === 'الجهة' || key === 'company') return vars.company || '';
    if (key === 'التاريخ' || key === 'date') return vars.date || new Date().toLocaleDateString();
    return '';
  });
}

export function previewTemplate(body: string, vars: TemplateVars, locale: string): string {
  const filled = applyTemplate(body, {
    name: vars.name || (locale === 'en' ? 'Customer' : 'العميل'),
    company: vars.company || (locale === 'en' ? 'Company' : 'الجهة'),
    date: vars.date || new Date().toLocaleDateString(locale === 'en' ? 'en-GB' : 'ar-IQ')
  });
  return filled;
}

/**
 * Built-in templates are seeded in Arabic once; translate their title/body
 * through the active locale dictionary without mutating the stored data.
 */
export function localizedTemplate(template: Template, t: (ar: string, en: string) => string): { title: string; body: string } {
  if (!template.builtin) return { title: template.title, body: template.body };
  return {
    title: t(template.title, template.titleEn || template.title),
    body: t(template.body, template.bodyEn || template.body)
  };
}
