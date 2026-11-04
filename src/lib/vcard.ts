import { downloadBlob } from './image';
import { normalizeDigits } from './phone';

export interface VCardInput {
  name: string;
  phone?: string;
  username?: string;
  note?: string;
  url?: string;
}

function escape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function buildVCard(input: VCardInput): string {
  const name = escape(input.name || 'WhatsApp');
  const phone = (input.phone || '').replace(/\D/g, '');
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${name}`, `N:${name};;;;`, 'ORG:ADMH'];
  if (phone) lines.push(`TEL;TYPE=CELL:+${phone}`);
  if (input.url) lines.push(`URL:${input.url}`);
  if (input.note) lines.push(`NOTE:${escape(input.note)}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export function downloadVCard(input: VCardInput): void {
  const safeName = (input.name || 'whatsapp').replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 40);
  downloadBlob(new Blob([buildVCard(input)], { type: 'text/vcard;charset=utf-8' }), `${safeName || 'contact'}.vcf`);
}

export interface ParsedVCard {
  name: string;
  phone: string;
}

export function parseVCards(text: string): ParsedVCard[] {
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const blocks = unfolded.split(/BEGIN:VCARD/i).slice(1);
  const results: ParsedVCard[] = [];
  for (const block of blocks) {
    const body = block.split(/END:VCARD/i)[0];
    const lines = new Map<string, string>();
    for (const line of body.split(/\r?\n/)) {
      const colon = line.indexOf(':');
      if (colon < 0) continue;
      const key = line.slice(0, colon).split(';')[0].toUpperCase();
      const value = line.slice(colon + 1).trim();
      if (!lines.has(key)) lines.set(key, value);
    }
    const name = (lines.get('FN') || lines.get('N') || '').replace(/\\,/g, ',').replace(/\\;/g, ';').trim();
    const tel = lines.get('TEL') || '';
    const phone = normalizeDigits(tel).replace(/[^\d]/g, '');
    if (phone || name) results.push({ name: name || (phone ? '+' + phone : ''), phone });
  }
  return results;
}
