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
