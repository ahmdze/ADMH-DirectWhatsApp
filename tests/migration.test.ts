import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterAll, describe, expect, it } from 'vitest';

const DB_NAME = 'admh-direct-whatsapp-v2';

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe('Dexie v1 -> v2 migration', () => {
  afterAll(async () => {
    const module = await import('../src/lib/db');
    module.db.close();
    await deleteDatabase(DB_NAME);
  });

  it('keeps existing rows and adds the additive trash table', async () => {
    await deleteDatabase(DB_NAME);

    const legacy = new Dexie(DB_NAME);
    legacy.version(1).stores({
      workspaces: 'id, createdAt',
      destinations: 'id, workspaceId, favorite, lastUsedAt, createdAt, type, *tags',
      templates: 'id, workspaceId, createdAt, lastUsedAt, *tags',
      history: 'id, workspaceId, usedAt, value',
      campaigns: 'id, workspaceId, createdAt',
      reminders: 'id, workspaceId, dueAt, done',
      meta: 'key'
    });
    await legacy.open();
    await legacy.table('reminders').put({
      id: 'legacy-reminder',
      workspaceId: 'personal',
      fingerprint: '9647701234567',
      label: 'Legacy',
      display: '+964 770 123 4567',
      dueAt: 1_800_000_000_000,
      done: false,
      createdAt: 1_700_000_000_000
    });
    await legacy.table('meta').put({ key: 'seeded-v2', value: true });
    legacy.close();

    const { db } = await import('../src/lib/db');
    await db.open();

    expect(await db.reminders.count()).toBe(1);
    expect(await db.reminders.get('legacy-reminder')).toMatchObject({
      id: 'legacy-reminder',
      workspaceId: 'personal'
    });
    expect(db.tables.map((table) => table.name)).toContain('trash');
    expect(await db.trash.count()).toBe(0);
  });
});
