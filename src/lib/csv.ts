import type { Destination, HistoryEntry } from '../types';
import { downloadBlob } from './image';

function escapeCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

export function toCsv(rows: Array<Array<string | number | boolean | null | undefined>>): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

export function downloadTextFile(content: string, filename: string, mime = 'text/plain;charset=utf-8'): void {
  const bom = mime.includes('text/csv') ? '\ufeff' : '';
  downloadBlob(new Blob([bom + content], { type: mime }), filename);
}

export function destinationsToCsv(destinations: Destination[]): string {
  const rows: Array<Array<string | number | boolean | null | undefined>> = [
    ['label', 'type', 'value', 'tags', 'note', 'favorite', 'useCount', 'createdAt', 'lastUsedAt']
  ];
  for (const item of destinations) {
    rows.push([
      item.label,
      item.type,
      item.type === 'phone' ? '+' + (item.phone || '') : '@' + (item.username || ''),
      item.tags.join('|'),
      item.note || '',
      item.favorite ? 'yes' : 'no',
      item.useCount,
      new Date(item.createdAt).toISOString(),
      item.lastUsedAt ? new Date(item.lastUsedAt).toISOString() : ''
    ]);
  }
  return toCsv(rows);
}

export function historyToCsv(history: HistoryEntry[]): string {
  const rows: Array<Array<string | number | null | undefined>> = [['targetType', 'value', 'display', 'messagePreview', 'usedAt']];
  for (const item of history) {
    rows.push([item.targetType, item.value, item.display, item.messagePreview || '', new Date(item.usedAt).toISOString()]);
  }
  return toCsv(rows);
}

export function exportDestinationsCsv(destinations: Destination[]): void {
  downloadTextFile(destinationsToCsv(destinations), `admh-destinations-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
}

export function exportHistoryCsv(history: HistoryEntry[]): void {
  downloadTextFile(historyToCsv(history), `admh-history-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
}

/** Minimal RFC4180 parser (handles quotes, commas, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const clean = text.replace(/^\ufeff/, '');
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((line) => line.some((value) => value.trim() !== ''));
}

export interface CsvContact {
  name: string;
  phone: string;
}

/** Parse a contacts CSV. Accepts Arabic or English headers, or "name,phone" columns. */
export function parseContactsCsv(text: string): CsvContact[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0].map((value) => value.trim().toLowerCase());
  const nameIndex = header.findIndex((value) => ['name', 'label', 'الاسم', 'اسم', 'الجهة'].includes(value));
  const phoneIndex = header.findIndex((value) => ['phone', 'number', 'tel', 'mobile', 'الهاتف', 'الرقم', 'رقم', 'الجوال'].includes(value));
  const start = nameIndex >= 0 || phoneIndex >= 0 ? 1 : 0;
  const contacts: CsvContact[] = [];
  for (let i = start; i < rows.length; i += 1) {
    const row = rows[i];
    const name = (nameIndex >= 0 ? row[nameIndex] : row[0])?.trim() || '';
    const phone = (phoneIndex >= 0 ? row[phoneIndex] : row[1])?.trim() || '';
    if (phone) contacts.push({ name: name || phone, phone });
  }
  return contacts;
}
