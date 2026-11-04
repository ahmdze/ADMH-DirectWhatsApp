import type { BackupFile, Campaign, Destination, HistoryEntry, Reminder, Template, Workspace } from '../types';
import { db, ensureDatabase, getMeta, setMeta } from './db';
import { getSettings, replaceSettingsFromBackup } from './settings';
import { downloadBlob } from './image';

export async function buildBackup(includeSettings = true): Promise<BackupFile> {
  const [workspaces, destinations, templates, history, campaigns, reminders] = await Promise.all([
    db.workspaces.toArray(),
    db.destinations.toArray(),
    db.templates.toArray(),
    db.history.toArray(),
    db.campaigns.toArray(),
    db.reminders.toArray()
  ]);
  return {
    app: 'admh-direct-whatsapp',
    version: 2,
    exportedAt: new Date().toISOString(),
    workspaces,
    destinations,
    templates,
    history,
    campaigns,
    reminders,
    settings: includeSettings ? getSettings() : undefined
  };
}

export async function downloadBackup(includeSettings = true): Promise<void> {
  const backup = await buildBackup(includeSettings);
  const json = JSON.stringify(backup, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(new Blob([json], { type: 'application/json;charset=utf-8' }), `admh-whatsapp-backup-${date}.json`);
}

export type BackupError = 'invalid' | 'unsupported' | 'empty';

export interface BackupValidation {
  ok: boolean;
  error?: BackupError;
  data?: BackupFile;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function validateBackup(raw: unknown): BackupValidation {
  if (!isObject(raw)) return { ok: false, error: 'invalid' };
  if (raw.app !== 'admh-direct-whatsapp') return { ok: false, error: 'invalid' };
  if (raw.version !== 2) return { ok: false, error: 'unsupported' };
  const data: BackupFile = {
    app: 'admh-direct-whatsapp',
    version: 2,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    workspaces: asArray<Workspace>(raw.workspaces).filter((item) => item && typeof item.id === 'string'),
    destinations: asArray<Destination>(raw.destinations).filter((item) => item && typeof item.id === 'string' && (item.type === 'phone' || item.type === 'username')),
    templates: asArray<Template>(raw.templates).filter((item) => item && typeof item.id === 'string' && typeof item.body === 'string'),
    history: asArray<HistoryEntry>(raw.history).filter((item) => item && typeof item.id === 'string'),
    campaigns: asArray<Campaign>(raw.campaigns).filter((item) => item && typeof item.id === 'string'),
    reminders: asArray<Reminder>(raw.reminders).filter((item) => item && typeof item.id === 'string'),
    settings: raw.settings && isObject(raw.settings) ? (raw.settings as unknown as BackupFile['settings']) : undefined
  };
  if (!data.destinations.length && !data.templates.length && !data.history.length) return { ok: false, error: 'empty' };
  return { ok: true, data };
}

export interface ImportResult {
  workspaces: number;
  destinations: number;
  templates: number;
  history: number;
  campaigns: number;
  reminders: number;
}

export async function importBackup(
  data: BackupFile,
  mode: 'merge' | 'replace',
  includeSettings: boolean
): Promise<ImportResult> {
  const result: ImportResult = {
    workspaces: data.workspaces.length,
    destinations: data.destinations.length,
    templates: data.templates.length,
    history: data.history.length,
    campaigns: data.campaigns.length,
    reminders: data.reminders.length
  };

  const write = async () => {
    if (mode === 'replace') {
      await Promise.all([
        db.workspaces.clear(),
        db.destinations.clear(),
        db.templates.clear(),
        db.history.clear(),
        db.campaigns.clear(),
        db.reminders.clear()
      ]);
      await setMeta('seeded-v2', false);
    }
    if (data.workspaces.length) await db.workspaces.bulkPut(data.workspaces);
    if (data.destinations.length) await db.destinations.bulkPut(data.destinations);
    if (data.templates.length) await db.templates.bulkPut(data.templates);
    if (data.history.length) await db.history.bulkPut(data.history);
    if (data.campaigns.length) await db.campaigns.bulkPut(data.campaigns);
    if (data.reminders.length) await db.reminders.bulkPut(data.reminders);
  };

  await write();
  if (mode === 'replace') {
    const meta = await getMeta<boolean>('seeded-v2');
    if (!meta) await ensureDatabase();
  }
  if (includeSettings && data.settings) replaceSettingsFromBackup(data.settings);
  return result;
}
