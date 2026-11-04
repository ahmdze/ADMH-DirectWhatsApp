import { describe, expect, it } from 'vitest';
import { parseContactsCsv, parseCsv, toCsv } from '../src/lib/csv';
import { buildVCard, parseVCards } from '../src/lib/vcard';

describe('csv', () => {
  it('escapes quotes and commas', () => {
    expect(toCsv([['a,b', 'c"d']])).toBe('"a,b","c""d"');
  });
  it('parses quoted cells', () => {
    expect(parseCsv('name,phone\n"أحمد، زياد",07701234567')).toEqual([
      ['name', 'phone'],
      ['أحمد، زياد', '07701234567']
    ]);
  });
  it('parses Arabic contact headers', () => {
    expect(parseContactsCsv('الاسم,الرقم\nأحمد,07701234567\nسارة,07709876543')).toEqual([
      { name: 'أحمد', phone: '07701234567' },
      { name: 'سارة', phone: '07709876543' }
    ]);
  });
  it('parses a headerless two column file', () => {
    expect(parseContactsCsv('أحمد,07701234567')).toEqual([{ name: 'أحمد', phone: '07701234567' }]);
  });
});

describe('vcard', () => {
  it('builds a valid vcard', () => {
    const card = buildVCard({ name: 'أحمد زياد', phone: '9647701234567', note: 'عميل' });
    expect(card).toContain('BEGIN:VCARD');
    expect(card).toContain('FN:أحمد زياد');
    expect(card).toContain('TEL;TYPE=CELL:+9647701234567');
    expect(card).toContain('END:VCARD');
  });
  it('round-trips name and phone', () => {
    const card = buildVCard({ name: 'ADMH', phone: '9647701234567' });
    expect(parseVCards(card)).toEqual([{ name: 'ADMH', phone: '9647701234567' }]);
  });
  it('parses folded lines and multiple cards', () => {
    const text = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:أحمد',
      'TEL;TYPE=CELL:+964 770 123 4567',
      'END:VCARD',
      'BEGIN:VCARD',
      'FN:Sara',
      'TEL;CELL:0770-987-6543',
      'END:VCARD'
    ].join('\r\n');
    expect(parseVCards(text)).toEqual([
      { name: 'أحمد', phone: '9647701234567' },
      { name: 'Sara', phone: '07709876543' }
    ]);
  });
});
