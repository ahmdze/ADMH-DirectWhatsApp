import { describe, expect, it } from 'vitest';
import { applyTemplate, hasVariables, previewTemplate, templateVariables } from '../src/lib/template';

describe('template variables', () => {
  it('detects Arabic and English variables', () => {
    expect(templateVariables('مرحباً {الاسم} من {الجهة} بتاريخ {date}')).toEqual(['name', 'company', 'date']);
  });
  it('detects duplicates once', () => {
    expect(templateVariables('{name} {name} {الاسم}')).toEqual(['name']);
  });
  it('reports templates without variables', () => {
    expect(hasVariables('نص عادي')).toBe(false);
  });
  it('applies variables', () => {
    expect(applyTemplate('مرحباً {الاسم}، {الجهة}', { name: 'أحمد', company: 'ADMH' })).toBe('مرحباً أحمد، ADMH');
  });
  it('keeps the date when not provided', () => {
    const result = applyTemplate('{date}', {});
    expect(result.length).toBeGreaterThan(0);
  });
  it('previews with fallbacks', () => {
    expect(previewTemplate('مرحباً {الاسم}', {}, 'ar')).toContain('العميل');
    expect(previewTemplate('Hello {name}', {}, 'en')).toContain('Customer');
  });
});
