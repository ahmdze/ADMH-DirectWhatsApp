/**
 * Country dial codes + national number lengths.
 * Lengths refer to the national significant number (without dial code / trunk prefix).
 * `undefined` lengths means "accept 6–15 digits and let WhatsApp validate".
 */
export interface Country {
  iso: string;
  dial: string;
  ar: string;
  en: string;
  flag: string;
  lengths?: number[];
  example?: string;
}

export const COUNTRIES: Country[] = [
  { iso: 'IQ', dial: '964', ar: 'العراق', en: 'Iraq', flag: '🇮🇶', lengths: [10], example: '07701234567' },
  { iso: 'SA', dial: '966', ar: 'السعودية', en: 'Saudi Arabia', flag: '🇸🇦', lengths: [9], example: '0512345678' },
  { iso: 'AE', dial: '971', ar: 'الإمارات', en: 'UAE', flag: '🇦🇪', lengths: [9], example: '0501234567' },
  { iso: 'KW', dial: '965', ar: 'الكويت', en: 'Kuwait', flag: '🇰🇼', lengths: [8], example: '50123456' },
  { iso: 'QA', dial: '974', ar: 'قطر', en: 'Qatar', flag: '🇶🇦', lengths: [8], example: '33123456' },
  { iso: 'OM', dial: '968', ar: 'عُمان', en: 'Oman', flag: '🇴🇲', lengths: [8], example: '91234567' },
  { iso: 'BH', dial: '973', ar: 'البحرين', en: 'Bahrain', flag: '🇧🇭', lengths: [8], example: '36123456' },
  { iso: 'JO', dial: '962', ar: 'الأردن', en: 'Jordan', flag: '🇯🇴', lengths: [9], example: '0791234567' },
  { iso: 'EG', dial: '20', ar: 'مصر', en: 'Egypt', flag: '🇪🇬', lengths: [10], example: '01012345678' },
  { iso: 'SY', dial: '963', ar: 'سوريا', en: 'Syria', flag: '🇸🇾', lengths: [9], example: '0944123456' },
  { iso: 'LB', dial: '961', ar: 'لبنان', en: 'Lebanon', flag: '🇱🇧', lengths: [7, 8], example: '71234567' },
  { iso: 'PS', dial: '970', ar: 'فلسطين', en: 'Palestine', flag: '🇵🇸', lengths: [9], example: '0599123456' },
  { iso: 'YE', dial: '967', ar: 'اليمن', en: 'Yemen', flag: '🇾🇪', lengths: [9], example: '0712345678' },
  { iso: 'SD', dial: '249', ar: 'السودان', en: 'Sudan', flag: '🇸🇩', lengths: [9], example: '0912345678' },
  { iso: 'LY', dial: '218', ar: 'ليبيا', en: 'Libya', flag: '🇱🇾', lengths: [9], example: '0912345678' },
  { iso: 'TN', dial: '216', ar: 'تونس', en: 'Tunisia', flag: '🇹🇳', lengths: [8], example: '20123456' },
  { iso: 'DZ', dial: '213', ar: 'الجزائر', en: 'Algeria', flag: '🇩🇿', lengths: [9], example: '0551234567' },
  { iso: 'MA', dial: '212', ar: 'المغرب', en: 'Morocco', flag: '🇲🇦', lengths: [9], example: '0612345678' },
  { iso: 'MR', dial: '222', ar: 'موريتانيا', en: 'Mauritania', flag: '🇲🇷', lengths: [8] },
  { iso: 'KM', dial: '269', ar: 'جزر القمر', en: 'Comoros', flag: '🇰🇲', lengths: [7] },
  { iso: 'DJ', dial: '253', ar: 'جيبوتي', en: 'Djibouti', flag: '🇩🇯', lengths: [8] },
  { iso: 'SO', dial: '252', ar: 'الصومال', en: 'Somalia', flag: '🇸🇴', lengths: [9] },
  { iso: 'TR', dial: '90', ar: 'تركيا', en: 'Türkiye', flag: '🇹🇷', lengths: [10], example: '05321234567' },
  { iso: 'IR', dial: '98', ar: 'إيران', en: 'Iran', flag: '🇮🇷', lengths: [10] },
  { iso: 'US', dial: '1', ar: 'الولايات المتحدة', en: 'United States', flag: '🇺🇸', lengths: [10], example: '2025550123' },
  { iso: 'CA', dial: '1', ar: 'كندا', en: 'Canada', flag: '🇨🇦', lengths: [10] },
  { iso: 'GB', dial: '44', ar: 'المملكة المتحدة', en: 'United Kingdom', flag: '🇬🇧', lengths: [10], example: '07123456789' },
  { iso: 'DE', dial: '49', ar: 'ألمانيا', en: 'Germany', flag: '🇩🇪', lengths: [10, 11] },
  { iso: 'FR', dial: '33', ar: 'فرنسا', en: 'France', flag: '🇫🇷', lengths: [9] },
  { iso: 'NL', dial: '31', ar: 'هولندا', en: 'Netherlands', flag: '🇳🇱', lengths: [9] },
  { iso: 'BE', dial: '32', ar: 'بلجيكا', en: 'Belgium', flag: '🇧🇪', lengths: [9] },
  { iso: 'CH', dial: '41', ar: 'سويسرا', en: 'Switzerland', flag: '🇨🇭', lengths: [9] },
  { iso: 'AT', dial: '43', ar: 'النمسا', en: 'Austria', flag: '🇦🇹', lengths: [10] },
  { iso: 'SE', dial: '46', ar: 'السويد', en: 'Sweden', flag: '🇸🇪', lengths: [9] },
  { iso: 'NO', dial: '47', ar: 'النرويج', en: 'Norway', flag: '🇳🇴', lengths: [8] },
  { iso: 'DK', dial: '45', ar: 'الدنمارك', en: 'Denmark', flag: '🇩🇰', lengths: [8] },
  { iso: 'FI', dial: '358', ar: 'فنلندا', en: 'Finland', flag: '🇫🇮', lengths: [9, 10] },
  { iso: 'IE', dial: '353', ar: 'أيرلندا', en: 'Ireland', flag: '🇮🇪', lengths: [9] },
  { iso: 'IT', dial: '39', ar: 'إيطاليا', en: 'Italy', flag: '🇮🇹', lengths: [9, 10] },
  { iso: 'ES', dial: '34', ar: 'إسبانيا', en: 'Spain', flag: '🇪🇸', lengths: [9] },
  { iso: 'PT', dial: '351', ar: 'البرتغال', en: 'Portugal', flag: '🇵🇹', lengths: [9] },
  { iso: 'GR', dial: '30', ar: 'اليونان', en: 'Greece', flag: '🇬🇷', lengths: [10] },
  { iso: 'RO', dial: '40', ar: 'رومانيا', en: 'Romania', flag: '🇷🇴', lengths: [9] },
  { iso: 'PL', dial: '48', ar: 'بولندا', en: 'Poland', flag: '🇵🇱', lengths: [9] },
  { iso: 'RU', dial: '7', ar: 'روسيا', en: 'Russia', flag: '🇷🇺', lengths: [10] },
  { iso: 'UA', dial: '380', ar: 'أوكرانيا', en: 'Ukraine', flag: '🇺🇦', lengths: [9] },
  { iso: 'AU', dial: '61', ar: 'أستراليا', en: 'Australia', flag: '🇦🇺', lengths: [9] },
  { iso: 'IN', dial: '91', ar: 'الهند', en: 'India', flag: '🇮🇳', lengths: [10] },
  { iso: 'PK', dial: '92', ar: 'باكستان', en: 'Pakistan', flag: '🇵🇰', lengths: [10] },
  { iso: 'BD', dial: '880', ar: 'بنغلاديش', en: 'Bangladesh', flag: '🇧🇩', lengths: [10] },
  { iso: 'AF', dial: '93', ar: 'أفغانستان', en: 'Afghanistan', flag: '🇦🇫', lengths: [9] },
  { iso: 'LK', dial: '94', ar: 'سريلانكا', en: 'Sri Lanka', flag: '🇱🇰', lengths: [9] },
  { iso: 'NP', dial: '977', ar: 'نيبال', en: 'Nepal', flag: '🇳🇵', lengths: [10] },
  { iso: 'PH', dial: '63', ar: 'الفلبين', en: 'Philippines', flag: '🇵🇭', lengths: [10] },
  { iso: 'ID', dial: '62', ar: 'إندونيسيا', en: 'Indonesia', flag: '🇮🇩', lengths: [9, 10, 11, 12] },
  { iso: 'MY', dial: '60', ar: 'ماليزيا', en: 'Malaysia', flag: '🇲🇾', lengths: [9, 10] },
  { iso: 'NG', dial: '234', ar: 'نيجيريا', en: 'Nigeria', flag: '🇳🇬', lengths: [10] },
  { iso: 'ZA', dial: '27', ar: 'جنوب أفريقيا', en: 'South Africa', flag: '🇿🇦', lengths: [9] },
  { iso: 'BR', dial: '55', ar: 'البرازيل', en: 'Brazil', flag: '🇧🇷', lengths: [10, 11] },
  { iso: 'ET', dial: '251', ar: 'إثيوبيا', en: 'Ethiopia', flag: '🇪🇹', lengths: [9] },
  { iso: 'AZ', dial: '994', ar: 'أذربيجان', en: 'Azerbaijan', flag: '🇦🇿', lengths: [9] },
  { iso: 'GE', dial: '995', ar: 'جورجيا', en: 'Georgia', flag: '🇬🇪', lengths: [9] },
  { iso: 'KZ', dial: '7', ar: 'كازاخستان', en: 'Kazakhstan', flag: '🇰🇿', lengths: [10] }
];

/** Longest dial prefix first, so +1 964… is not mistaken for +1 + 964. */
export const COUNTRIES_BY_DIAL_LENGTH = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

export function countryByDial(dial: string): Country | undefined {
  return COUNTRIES.find((c) => c.dial === dial);
}

export function countryByIso(iso: string): Country | undefined {
  return COUNTRIES.find((c) => c.iso === iso);
}

export function normalizeIso(input: string | undefined | null): string {
  const iso = String(input || '').toUpperCase();
  return countryByIso(iso) ? iso : 'IQ';
}

/** Find the most likely country for E.164 digits (without +). */
export function detectCountry(digits: string): Country | undefined {
  for (const c of COUNTRIES_BY_DIAL_LENGTH) {
    if (!digits.startsWith(c.dial)) continue;
    const national = digits.slice(c.dial.length);
    if (!c.lengths) return c;
    if (c.lengths.includes(national.length)) return c;
  }
  // Fallback: first prefix match even if length doesn't match
  return COUNTRIES_BY_DIAL_LENGTH.find((c) => digits.startsWith(c.dial));
}

export function countryName(c: Country, locale: string): string {
  return locale === 'en' ? c.en : c.ar;
}
