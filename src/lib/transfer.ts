import type { Destination, TargetType, Template } from '../types';
import { addDestination, addTemplate, db, updateDestination } from './db';
import { uid } from './format';

/** Prefix for QR/text transfer payloads. Format: `ADMH1:<base64url(JSON UTF-8)>`. */
export const TRANSFER_PREFIX = 'ADMH1:';
export const TRANSFER_APP = 'admh-transfer';
export const TRANSFER_VERSION = 1;
/** Above this payload size a QR code becomes unreliable — the UI offers the backup file instead. */
export const TRANSFER_QR_MAX_BYTES = 1800;
/** Hard cap for scanned text so a weird payload cannot exhaust memory. */
export const TRANSFER_MAX_TEXT_LENGTH = 4096;
const MAX_DESTINATIONS = 40;
const MAX_TEMPLATES = 10;

export type TransferKind = 'destination' | 'template' | 'bundle';

export interface TransferPayload {
  app: typeof TRANSFER_APP;
  version: typeof TRANSFER_VERSION;
  kind: TransferKind;
  destinations?: Destination[];
  templates?: Template[];
}

export type TransferDecodeError = 'empty' | 'prefix' | 'format' | 'too_large' | 'version' | 'structure';

export type TransferDecodeResult = { ok: true; payload: TransferPayload } | { ok: false; error: TransferDecodeError };

export type DestinationMergeMode = 'skip' | 'update';

export interface TransferMergeResult {
  addedDestinations: number;
  updatedDestinations: number;
  skippedDestinations: number;
  addedTemplates: number;
  skippedTemplates: number;
  failed: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

export function createTransferPayload(destinations: Destination[], templates: Template[]): TransferPayload {
  const kind: TransferKind = destinations.length > 0 && templates.length > 0 ? 'bundle' : templates.length > 0 ? 'template' : 'destination';
  return {
    app: TRANSFER_APP,
    version: TRANSFER_VERSION,
    kind,
    destinations: destinations.length ? destinations : undefined,
    templates: templates.length ? templates : undefined
  };
}

export function encodeTransferPayload(payload: TransferPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return TRANSFER_PREFIX + bytesToBase64Url(bytes);
}

export function transferTextByteSize(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function isTransferText(value: string): boolean {
  return typeof value === 'string' && value.trim().startsWith(TRANSFER_PREFIX);
}

export function countTransferPayload(payload: TransferPayload): { destinations: number; templates: number } {
  return { destinations: payload.destinations?.length ?? 0, templates: payload.templates?.length ?? 0 };
}

function sanitizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  for (const tag of value) {
    if (typeof tag !== 'string') continue;
    const clean = tag.trim().slice(0, 30);
    if (clean && !tags.includes(clean) && tags.length < 8) tags.push(clean);
  }
  return tags;
}

function sanitizeDestination(value: unknown): Destination | null {
  if (!isObject(value)) return null;
  const type: TargetType | null = value.type === 'phone' ? 'phone' : value.type === 'username' ? 'username' : null;
  if (!type) return null;
  const phone = typeof value.phone === 'string' ? value.phone.replace(/\D/g, '') : '';
  const username = typeof value.username === 'string' ? value.username.replace(/^@/, '').trim() : '';
  if (type === 'phone' && !/^\d{6,15}$/.test(phone)) return null;
  if (type === 'username' && !/^[A-Za-z0-9._-]{3,64}$/.test(username)) return null;
  const rawLabel = typeof value.label === 'string' ? value.label.trim() : '';
  const label = (rawLabel || (type === 'phone' ? '+' + phone : '@' + username)).slice(0, 80);
  const note = typeof value.note === 'string' && value.note.trim() ? value.note.trim().slice(0, 200) : undefined;
  const createdAt = typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) ? value.createdAt : Date.now();
  const useCount = typeof value.useCount === 'number' && Number.isFinite(value.useCount) ? Math.max(0, Math.floor(value.useCount)) : 0;
  return {
    id: uid(),
    workspaceId: typeof value.workspaceId === 'string' ? value.workspaceId.slice(0, 80) : '',
    type,
    phone: type === 'phone' ? phone : undefined,
    username: type === 'username' ? username : undefined,
    label,
    note,
    tags: sanitizeTags(value.tags),
    favorite: value.favorite === true,
    createdAt,
    useCount
  };
}

function sanitizeTemplate(value: unknown): Template | null {
  if (!isObject(value)) return null;
  const body = typeof value.body === 'string' ? value.body.trim().slice(0, 2000) : '';
  if (!body) return null;
  const rawTitle = typeof value.title === 'string' ? value.title.trim() : '';
  const title = (rawTitle || body.slice(0, 40)).slice(0, 60);
  const titleEn = typeof value.titleEn === 'string' && value.titleEn.trim() ? value.titleEn.trim().slice(0, 60) : undefined;
  const bodyEn = typeof value.bodyEn === 'string' && value.bodyEn.trim() ? value.bodyEn.trim().slice(0, 2000) : undefined;
  const createdAt = typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) ? value.createdAt : Date.now();
  return {
    id: uid(),
    workspaceId: typeof value.workspaceId === 'string' ? value.workspaceId.slice(0, 80) : '',
    title,
    titleEn,
    body,
    bodyEn,
    tags: sanitizeTags(value.tags),
    createdAt
  };
}

function sanitizeDestinations(value: unknown): Destination[] {
  if (!Array.isArray(value)) return [];
  const result: Destination[] = [];
  for (const item of value) {
    if (result.length >= MAX_DESTINATIONS) break;
    const destination = sanitizeDestination(item);
    if (destination) result.push(destination);
  }
  return result;
}

function sanitizeTemplates(value: unknown): Template[] {
  if (!Array.isArray(value)) return [];
  const result: Template[] = [];
  for (const item of value) {
    if (result.length >= MAX_TEMPLATES) break;
    const template = sanitizeTemplate(item);
    if (template) result.push(template);
  }
  return result;
}

/** Validate and normalize an `ADMH1:` transfer string. Never throws. */
export function decodeTransferText(raw: string): TransferDecodeResult {
  const value = String(raw || '').trim();
  if (!value) return { ok: false, error: 'empty' };
  if (value.length > TRANSFER_MAX_TEXT_LENGTH) return { ok: false, error: 'too_large' };
  if (!value.startsWith(TRANSFER_PREFIX)) return { ok: false, error: 'prefix' };
  const encoded = value.slice(TRANSFER_PREFIX.length).trim();
  if (!encoded) return { ok: false, error: 'format' };
  const bytes = base64UrlToBytes(encoded);
  if (!bytes || bytes.length === 0) return { ok: false, error: 'format' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return { ok: false, error: 'format' };
  }
  if (!isObject(parsed)) return { ok: false, error: 'structure' };
  if (parsed.app !== TRANSFER_APP) return { ok: false, error: 'structure' };
  if (parsed.version !== TRANSFER_VERSION) return { ok: false, error: 'version' };
  const kind = parsed.kind;
  if (kind !== 'destination' && kind !== 'template' && kind !== 'bundle') return { ok: false, error: 'structure' };

  const destinations = sanitizeDestinations(parsed.destinations);
  const templates = sanitizeTemplates(parsed.templates);
  if (kind === 'destination' && (destinations.length === 0 || templates.length > 0)) return { ok: false, error: 'structure' };
  if (kind === 'template' && (templates.length === 0 || destinations.length > 0)) return { ok: false, error: 'structure' };
  if (kind === 'bundle' && destinations.length === 0 && templates.length === 0) return { ok: false, error: 'structure' };

  return {
    ok: true,
    payload: {
      app: TRANSFER_APP,
      version: TRANSFER_VERSION,
      kind,
      destinations: destinations.length ? destinations : undefined,
      templates: templates.length ? templates : undefined
    }
  };
}

function destinationKey(type: TargetType, value: string): string {
  return `${type}:${value}`;
}

function destinationValue(destination: ComparableDestination): string {
  return destination.type === 'phone' ? (destination.phone || '').replace(/\D/g, '') : (destination.username || '').replace(/^@/, '');
}

interface ComparableDestination {
  type: TargetType;
  phone?: string;
  username?: string;
}

function templateKey(template: { title: string; body: string }): string {
  return `${template.title.trim().toLowerCase()}\u0000${template.body.trim()}`;
}

/**
 * Merge a decoded transfer payload into the given workspace.
 * Destinations are matched by type+value; duplicate templates (title+body) are skipped.
 */
export async function mergeTransferPayload(
  payload: TransferPayload,
  options: { workspaceId: string; destinationMode: DestinationMergeMode }
): Promise<TransferMergeResult> {
  const result: TransferMergeResult = {
    addedDestinations: 0,
    updatedDestinations: 0,
    skippedDestinations: 0,
    addedTemplates: 0,
    skippedTemplates: 0,
    failed: 0
  };

  const existingDestinations = await db.destinations.where('workspaceId').equals(options.workspaceId).toArray();
  const existingByKey = new Map<string, Destination>();
  for (const destination of existingDestinations) {
    existingByKey.set(destinationKey(destination.type, destinationValue(destination)), destination);
  }

  const seen = new Set<string>();
  for (const incoming of payload.destinations ?? []) {
    const value = destinationValue(incoming);
    if (!value) {
      result.failed += 1;
      continue;
    }
    const key = destinationKey(incoming.type, value);
    if (seen.has(key)) {
      result.skippedDestinations += 1;
      continue;
    }
    seen.add(key);
    const match = existingByKey.get(key);
    if (!match) {
      await addDestination({
        workspaceId: options.workspaceId,
        type: incoming.type,
        phone: incoming.type === 'phone' ? value : undefined,
        username: incoming.type === 'username' ? value : undefined,
        label: incoming.label,
        note: incoming.note,
        tags: incoming.tags,
        favorite: incoming.favorite
      });
      result.addedDestinations += 1;
      continue;
    }
    if (options.destinationMode === 'update') {
      const tags = [...match.tags];
      for (const tag of incoming.tags) if (!tags.includes(tag)) tags.push(tag);
      await updateDestination(match.id, {
        label: incoming.label || match.label,
        note: match.note || incoming.note,
        tags,
        favorite: match.favorite || incoming.favorite
      });
      result.updatedDestinations += 1;
    } else {
      result.skippedDestinations += 1;
    }
  }

  const existingTemplates = await db.templates.where('workspaceId').equals(options.workspaceId).toArray();
  const seenTemplates = new Set(existingTemplates.map((template) => templateKey(template)));
  for (const incoming of payload.templates ?? []) {
    const key = templateKey(incoming);
    if (seenTemplates.has(key)) {
      result.skippedTemplates += 1;
      continue;
    }
    seenTemplates.add(key);
    await addTemplate({
      workspaceId: options.workspaceId,
      title: incoming.title,
      titleEn: incoming.titleEn,
      body: incoming.body,
      bodyEn: incoming.bodyEn,
      tags: incoming.tags
    });
    result.addedTemplates += 1;
  }

  return result;
}
