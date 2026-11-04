/**
 * One-time pre-upgrade backup.
 *
 * v2.4 adds only additive Dexie columns/tables, so the current rows remain
 * readable. To protect users against an Alpha bug, the first v2.4 launch
 * snapshots the whole database into a separate IndexedDB database. The backup
 * is kept outside the main database so it survives normal data resets, and it
 * can always be downloaded as a JSON file from Settings.
 */
import Dexie, { type Table } from 'dexie';
import type { BackupFile } from '../types';
import { buildBackup } from './backup';
import { getMeta, setMeta } from './db';
import { downloadBlob } from './image';
import { getSettings } from './settings';

export const PRE_MIGRATION_BACKUP_ID = 'pre-v2.4.0';
const META_KEY = 'pre-migration-backup-v240';

export interface PreMigrationBackup {
  id: string;
  createdAt: number;
  sourceVersion: string;
  appVersion: string;
  data: BackupFile;
}

class PreMigrationBackupDB extends Dexie {
  backups!: Table<PreMigrationBackup, string>;

  constructor() {
    super('admh-pre-migration-backups-v1');
    this.version(1).stores({ backups: 'id, createdAt' });
  }
}

const backupDb = new PreMigrationBackupDB();
let createdThisLaunch = false;

function currentSourceVersion(): string {
  const seen = getSettings().lastSeenVersion;
  return seen && !seen.startsWith('2.4') ? seen : '2.3.5';
}

/** Create the snapshot once; safe to call on every boot. */
export async function ensurePreMigrationBackup(): Promise<PreMigrationBackup | null> {
  try {
    if (await getMeta<boolean>(META_KEY)) {
      return (await backupDb.backups.get(PRE_MIGRATION_BACKUP_ID)) ?? null;
    }

    const data = await buildBackup(true);
    const record: PreMigrationBackup = {
      id: PRE_MIGRATION_BACKUP_ID,
      createdAt: Date.now(),
      sourceVersion: currentSourceVersion(),
      appVersion: data.settings?.lastSeenVersion || currentSourceVersion(),
      data
    };
    await backupDb.backups.put(record);
    await setMeta(META_KEY, true);
    createdThisLaunch = true;
    return record;
  } catch {
    // Never block app startup because an optional safety copy failed.
    return null;
  }
}

export async function getPreMigrationBackup(): Promise<PreMigrationBackup | null> {
  try {
    return (await backupDb.backups.get(PRE_MIGRATION_BACKUP_ID)) ?? null;
  } catch {
    return null;
  }
}

export async function downloadPreMigrationBackup(): Promise<boolean> {
  const record = await getPreMigrationBackup();
  if (!record) return false;
  try {
    const json = JSON.stringify(record.data, null, 2);
    const date = new Date(record.createdAt).toISOString().slice(0, 10);
    downloadBlob(
      new Blob([json], { type: 'application/json;charset=utf-8' }),
      `admh-pre-upgrade-${record.sourceVersion}-${date}.json`
    );
    return true;
  } catch {
    return false;
  }
}

/** True once per launch when the automatic snapshot was created. */
export function consumePreMigrationBackupNotice(): boolean {
  if (!createdThisLaunch) return false;
  createdThisLaunch = false;
  return true;
}
