import { describe, expect, it } from 'vitest';
import { extractCandidateFromText, formatPhone, normalizeDigits, parseTarget } from '../src/lib/phone';
import { buildChatUrl } from '../src/lib/whatsapp';

function ok(raw: string, country = 'IQ') {
  const result = parseTarget(raw, { country });
  if (!result.ok) throw new Error(`expected ok but got ${result.code}`);
  return result.target;
}

function error(raw: string, country = 'IQ') {
  const result = parseTarget(raw, { country });
  if (result.ok) throw new Error(`expected error but got ${result.target.display}`);
  return result.code;
}

describe('normalizeDigits', () => {
  it('converts Arabic-Indic digits', () => {
    expect(normalizeDigits('٠٧٧٠١٢٣٤٥٦٧')).toBe('07701234567');
  });
  it('converts Eastern Arabic-Indic digits', () => {
    expect(normalizeDigits('۰۷۷۰۱۲۳۴۵۶۷')).toBe('07701234567');
  });
});

describe('parseTarget — Iraqi numbers', () => {
  it('accepts local format and drops the trunk zero', () => {
    expect(ok('07701234567')).toEqual({ type: 'phone', value: '9647701234567', display: '+964 770 123 4567' });
  });
  it('accepts local format without zero', () => {
    expect(ok('7701234567').value).toBe('9647701234567');
  });
  it('accepts international plus format', () => {
    expect(ok('+964 770 123 4567').value).toBe('9647701234567');
  });
  it('accepts 00 international prefix', () => {
    expect(ok('00964 770 123 4567').value).toBe('9647701234567');
  });
  it('accepts the full number without plus', () => {
    expect(ok('9647701234567').value).toBe('9647701234567');
  });
  it('rejects Iraqi numbers that do not start with 7', () => {
    expect(error('01234567890')).toBe('invalid_prefix');
  });
  it('rejects wrong length', () => {
    expect(error('0770123456')).toBe('invalid_length');
  });
  it('rejects letters mixed with digits', () => {
    expect(error('0770abc4567')).toBe('invalid_chars');
  });
  it('rejects a misplaced plus sign', () => {
    expect(error('0770+1234567')).toBe('plus_position');
  });
});

describe('parseTarget — other countries', () => {
  it('accepts Saudi local number', () => {
    const target = parseTarget('0512345678', { country: 'SA' });
    expect(target.ok && target.target.value).toBe('966512345678');
  });
  it('accepts an international number regardless of selected country', () => {
    const target = parseTarget('+1 202 555 0123', { country: 'IQ' });
    expect(target.ok && target.target.value).toBe('12025550123');
  });
  it('detects the country from an international number', () => {
    const target = parseTarget('+971 50 123 4567', { country: 'IQ' });
    expect(target.ok && target.target.value).toBe('971501234567');
  });
  it('rejects numbers with an unknown country', () => {
    expect(parseTarget('+999 123456789', { country: 'IQ' }).ok).toBe(false);
  });
});

describe('parseTarget — usernames and links', () => {
  it('accepts @username', () => {
    expect(ok('@ahmad.ziad')).toEqual({ type: 'username', value: 'ahmad.ziad', display: '@ahmad.ziad' });
  });
  it('rejects short usernames', () => {
    expect(error('@ab')).toBe('invalid_username');
  });
  it('parses wa.me phone links', () => {
    expect(ok('https://wa.me/9647701234567').value).toBe('9647701234567');
  });
  it('parses api.whatsapp.com links with phone param', () => {
    expect(ok('https://api.whatsapp.com/send?phone=9647701234567').value).toBe('9647701234567');
  });
  it('parses wa.me username links', () => {
    const target = ok('https://wa.me/ahmadziad');
    expect(target).toEqual({ type: 'username', value: 'ahmadziad', display: '@ahmadziad' });
  });
  it('rejects non-WhatsApp links', () => {
    expect(error('https://example.com/9647701234567')).toBe('invalid_url');
  });
});

describe('formatting and extraction', () => {
  it('formats known numbers', () => {
    expect(formatPhone('9647701234567')).toBe('+964 770 123 4567');
    expect(formatPhone('966512345678')).toBe('+966 51 234 5678');
  });
  it('extracts a wa.me link from text', () => {
    expect(extractCandidateFromText('راسلني على https://wa.me/9647701234567 شكراً')).toBe('https://wa.me/9647701234567');
  });
  it('extracts a phone number from an ad', () => {
    expect(extractCandidateFromText('اتصل على 0770 123 4567')).toBe('0770 123 4567');
  });
  it('extracts a username', () => {
    expect(extractCandidateFromText('حسابي @ahmadziad')).toBe('@ahmadziad');
  });
  it('returns null when there is no target', () => {
    expect(extractCandidateFromText('مرحباً بكم')).toBeNull();
  });
});

describe('buildChatUrl', () => {
  it('builds a phone link with an encoded message', () => {
    const target = ok('+964 770 123 4567');
    expect(buildChatUrl(target, 'مرحباً')).toBe('https://wa.me/9647701234567?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B');
  });
  it('builds a username link', () => {
    const target = ok('@ahmadziad');
    expect(buildChatUrl(target)).toBe('https://wa.me/ahmadziad');
  });
});
