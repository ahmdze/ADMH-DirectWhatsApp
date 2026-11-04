import { COUNTRIES, COUNTRIES_BY_DIAL_LENGTH, countryByIso, detectCountry, type Country } from './countries';
import type { ParsedTarget, Target, TargetType } from '../types';

export type PhoneErrorCode =
  | 'empty'
  | 'too_long'
  | 'invalid_chars'
  | 'invalid_url'
  | 'invalid_username'
  | 'unknown_country'
  | 'invalid_length'
  | 'invalid_prefix'
  | 'plus_position'
  | 'invalid_number';

export const PHONE_ERRORS: Record<PhoneErrorCode, { ar: string; en: string }> = {
  empty: { ar: 'أدخل رقم الهاتف أو اسم المستخدم أولاً.', en: 'Enter a phone number or username first.' },
  too_long: { ar: 'المدخل أطول من اللازم.', en: 'The input is too long.' },
  invalid_chars: { ar: 'استخدم أرقاماً فقط، أو اسم مستخدم مسبوقاً بـ@.', en: 'Use digits only, or a username prefixed with @.' },
  invalid_url: { ar: 'الرابط المدخل ليس رابط واتساب معروفاً.', en: 'That does not look like a known WhatsApp link.' },
  invalid_username: { ar: 'صيغة اسم المستخدم غير صحيحة (3–64 حرفاً: حروف، أرقام، . _ -).', en: 'Invalid username format (3–64 chars: letters, digits, . _ -).' },
  unknown_country: { ar: 'لم نتمكن من تحديد مفتاح الدولة. اختر الدولة أو أدخل الرقم بصيغة + دولية.', en: 'Could not detect the country code. Pick a country or use + international format.' },
  invalid_length: { ar: 'طول الرقم لا يطابق صيغة الدولة المختارة.', en: 'The number length does not match the selected country.' },
  invalid_prefix: { ar: 'رقم الهاتف العراقي يجب أن يبدأ بعد مفتاح الدولة بالرقم 7.', en: 'An Iraqi mobile number must start with 7 after the country code.' },
  plus_position: { ar: 'علامة + يجب أن تكون في بداية الرقم فقط.', en: 'The + sign may only appear at the start of the number.' },
  invalid_number: { ar: 'الرقم غير صالح. تحقق منه وحاول مجدداً.', en: 'Invalid number. Please check it and try again.' }
};

const WA_HOSTS = new Set(['wa.me', 'www.wa.me', 'api.whatsapp.com', 'www.whatsapp.com', 'whatsapp.com', 'web.whatsapp.com']);

/** Convert Arabic-Indic and Eastern Arabic-Indic digits to ASCII. */
export function normalizeDigits(input: string): string {
  return input.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function stripFormatting(input: string): string {
  return normalizeDigits(input)
    .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
    .replace(/[\s().\-–—_]/g, '');
}

/** National number groups used for pretty display. */
const GROUP_HINTS: Record<string, Record<number, number[]>> = {
  IQ: { 10: [3, 3, 4] },
  SA: { 9: [2, 3, 4] },
  AE: { 9: [2, 3, 4] },
  KW: { 8: [4, 4] },
  QA: { 8: [4, 4] },
  OM: { 8: [4, 4] },
  BH: { 8: [4, 4] },
  JO: { 9: [2, 3, 4] },
  EG: { 10: [2, 4, 4] },
  SY: { 9: [3, 3, 3] },
  LB: { 8: [2, 3, 3] },
  PS: { 9: [2, 3, 4] },
  YE: { 9: [3, 3, 3] },
  TR: { 10: [3, 3, 4] },
  US: { 10: [3, 3, 4] },
  CA: { 10: [3, 3, 4] },
  GB: { 10: [4, 3, 3] },
  DE: { 10: [3, 3, 4], 11: [4, 3, 4] },
  FR: { 9: [2, 3, 4] },
  RU: { 10: [3, 3, 4] },
  IN: { 10: [3, 3, 4] },
  PK: { 10: [3, 3, 4] }
};

export function formatPhone(phoneDigits: string): string {
  const digits = normalizeDigits(phoneDigits).replace(/\D/g, '');
  const country = detectCountry(digits);
  if (!country) return '+' + digits;
  const national = digits.slice(country.dial.length);
  const groups = GROUP_HINTS[country.iso]?.[national.length];
  let grouped = national;
  if (groups) {
    let idx = 0;
    grouped = groups
      .map((size) => {
        const part = national.slice(idx, idx + size);
        idx += size;
        return part;
      })
      .filter(Boolean)
      .join(' ');
  } else if (national.length > 4) {
    const chunks: string[] = [];
    let rest = national;
    while (rest.length > 4) {
      chunks.unshift(rest.slice(-4));
      rest = rest.slice(0, -4);
    }
    chunks.unshift(rest);
    grouped = chunks.join(' ');
  }
  return `+${country.dial} ${grouped}`;
}

export function displayTarget(target: Target): string {
  return target.type === 'username' ? '@' + target.value : formatPhone(target.value);
}

export function validateUsername(name: string): boolean {
  return /^[A-Za-z0-9._-]{3,64}$/.test(name);
}

function usernameTarget(raw: string): ParsedTarget | null {
  const username = raw.replace(/^@/, '').trim();
  if (!validateUsername(username)) return null;
  return { type: 'username', value: username, display: '@' + username };
}

interface ParseOptions {
  /** ISO code of the selected default country (e.g. IQ). */
  country?: string;
}

interface ParseOk {
  ok: true;
  target: ParsedTarget;
}
interface ParseErr {
  ok: false;
  code: PhoneErrorCode;
}

export function parseTarget(rawInput: string, opts: ParseOptions = {}): ParseOk | ParseErr {
  let raw = normalizeDigits(String(rawInput || '')).trim();
  if (!raw) return { ok: false, code: 'empty' };
  if (raw.length > 320) return { ok: false, code: 'too_long' };

  // URLs
  if (/^https?:\/\//i.test(raw) || /^(?:wa\.me|api\.whatsapp\.com)\//i.test(raw)) {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
    let url: URL;
    try {
      url = new URL(withScheme);
    } catch {
      return { ok: false, code: 'invalid_url' };
    }
    if (!WA_HOSTS.has(url.hostname.toLowerCase())) return { ok: false, code: 'invalid_url' };
    const phoneParam = url.searchParams.get('phone') || '';
    const pathPart = decodeURIComponent(url.pathname.split('/').filter(Boolean)[0] || '');
    raw = phoneParam || pathPart;
    if (!raw) return { ok: false, code: 'invalid_url' };
    if (raw.startsWith('@')) return usernameTarget(raw) ? { ok: true, target: usernameTarget(raw)! } : { ok: false, code: 'invalid_username' };
    if (!/^\+?\d[\d\s().-]*$/.test(raw)) {
      const u = usernameTarget(raw);
      return u ? { ok: true, target: u } : { ok: false, code: 'invalid_username' };
    }
  }

  if (raw.startsWith('@')) {
    const t = usernameTarget(raw);
    return t ? { ok: true, target: t } : { ok: false, code: 'invalid_username' };
  }

  if (/[a-zA-Z\u0600-\u06FF]/.test(raw)) return { ok: false, code: 'invalid_chars' };
  if (/[+]/.test(raw.replace(/^\s*\+/, ''))) return { ok: false, code: 'plus_position' };

  let digits = stripFormatting(raw);
  let international = false;
  if (digits.startsWith('+')) {
    international = true;
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    international = true;
    digits = digits.slice(2);
  }
  if (!/^\d+$/.test(digits)) return { ok: false, code: 'invalid_chars' };
  if (digits.length < 6) return { ok: false, code: 'invalid_number' };

  const defaultCountry = countryByIso(opts.country || '') || countryByIso('IQ')!;

  const finish = (country: Country, nationalRaw: string): ParseOk | ParseErr => {
    let national = nationalRaw;
    if (national.startsWith('0')) national = national.slice(1);
    const total = country.dial + national;
    if (total.length < 8 || total.length > 15) return { ok: false, code: 'invalid_length' };
    if (country.lengths && !country.lengths.includes(national.length)) return { ok: false, code: 'invalid_length' };
    if (country.iso === 'IQ' && !national.startsWith('7')) return { ok: false, code: 'invalid_prefix' };
    return { ok: true, target: { type: 'phone', value: total, display: formatPhone(total) } };
  };

  if (!international) {
    // Explicitly entered with the selected country's dial code but not as +...
    if (digits.startsWith(defaultCountry.dial) && digits.length > defaultCountry.dial.length + 5) {
      const national = digits.slice(defaultCountry.dial.length);
      if (!defaultCountry.lengths || defaultCountry.lengths.includes(national.length)) {
        return finish(defaultCountry, national);
      }
    }
    // Standard local format, with or without trunk zero.
    const local = FinishLocal(defaultCountry, digits);
    if (local.ok) return local;
    // Maybe the user pasted an international number without +.
    const detected = detectCountry(digits);
    if (detected && detected.iso !== defaultCountry.iso) {
      const alt = finish(detected, digits.slice(detected.dial.length));
      if (alt.ok) return alt;
    }
    return local;
  }

  const detected = detectCountry(digits);
  if (!detected) return { ok: false, code: 'unknown_country' };
  return finish(detected, digits.slice(detected.dial.length));

  function FinishLocal(country: Country, localDigits: string): ParseOk | ParseErr {
    let national = localDigits;
    if (national.startsWith('0')) national = national.slice(1);
    if (country.lengths && !country.lengths.includes(national.length)) {
      return { ok: false, code: 'invalid_length' };
    }
    return finish(country, national);
  }
}

/** Extract the first plausible target from arbitrary text (ads, signatures, shared text). */
export function extractCandidateFromText(text: string): string | null {
  const value = normalizeDigits(String(text || ''));
  const wa = value.match(/https?:\/\/(?:www\.)?(?:wa\.me|api\.whatsapp\.com|whatsapp\.com)\/[^\s"'<>]+/i);
  if (wa) return wa[0];
  const at = value.match(/(?:^|\s)@([A-Za-z0-9._-]{3,64})\b/);
  if (at) return '@' + at[1];
  const phone = value.match(/(?:\+|00)?\d[\d\s().-]{7,18}\d/);
  if (phone) {
    const digits = phone[0].replace(/\D/g, '');
    if (digits.length >= 8) return phone[0].trim();
  }
  return null;
}

export function isUsernameTarget(target: Target | ParsedTarget): boolean {
  return target.type === 'username';
}

export function targetKey(type: TargetType, value: string): string {
  return `${type}:${value}`;
}

export function matchTarget(raw: Target, type: TargetType, value: string): boolean {
  return raw.type === type && raw.value === value;
}

export { COUNTRIES, COUNTRIES_BY_DIAL_LENGTH, countryByIso, detectCountry };
export type { Country };
